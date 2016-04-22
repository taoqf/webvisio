import {SvgCanvas} from './SvgCanvas';
import {SvgElementModel} from './SvgElementModel';
import {registerElementCreateEvent} from './SvgElementModel';
import {registerElementAddedEvent} from './SvgElement';
import {SvgElementShapeItem} from './SvgElement';
import {SvgElementLineItem} from './SvgElement';
import SvgUtility from './SvgUtility';

export let submitWPF;
let initParams;
let canvasCollection = [];
let stencils = [];
let baseLines = [];
let pageCount = 1;
let pageidx = 1;
let activedPageDom;
export let activedPageSvg;
let shapeDefine;
let runInWpf = false;
let deletePageFn;

// 初始化页面
export function initCanvas(params) {
    initParams = params;
    shapeDefine = params['shapeDefine'];
    stencils = params['models'];
    initStencilArea(stencils);
    runInWpf = params['runInWpf'] || false;
    createNewSvgPage();
    initPageBar();
    registerElementAddedEvent(elementAddedEvent);
    registerElementCreateEvent(elementAddedEvent);
    registerPageEvent();
}

// 初始化模板区
function initStencilArea(models) {
    let stencilContainer = document.getElementById('stencilContainer');
    if (!stencilContainer) {
        return false;
    }

    for (let i = 0, len = models.length; i < len; i++) {
		let isHide = models[i]['hideInStencil'];
		if (isHide){
			continue;
		}
        let gAttrs = [{ attr: 'class', val: 'Content' }];
        let shapeInfo = shapeDefine[models[i]['model']];
        let shapes = shapeInfo['elements'];
        let svgAttrs = [{ attr: 'id', val: models[i]['id'] }, { attr: 'width', val: shapeInfo['width'] }, { attr: 'height', val: shapeInfo['height'] }, { attr: 'style', val: 'margin:auto;' }, { attr: 'display', val: 'block' }];
        let scale = shapeInfo['scale'];
        if (scale) {
            gAttrs.push({ attr: 'transform', val: 'scale(' + scale + ')' });
        }
        let svgNode = SvgUtility.CreateSvgElement('svg', svgAttrs, stencilContainer);
        let nodeGroup = SvgUtility.CreateSvgElement('g', gAttrs, svgNode);
        // shape global
        let scalableGroup = SvgUtility.CreateSvgElement('g', [{ 'attr': 'class', 'val': 'scalable' }], nodeGroup);
        for (let j = 0, count = shapes.length; j < count; j++) {
            let item = shapes[j];
            SvgUtility.CreateSvgElement(item['svgType'], item['attrs'], scalableGroup);
        }
        // 构造text node
        let textInfos = shapeInfo['texts'];
        if (textInfos) {
            for (let i = 0, len = textInfos.length; i < len; i++) {
                let info = textInfos[i];
                let textNode = SvgUtility.CreateSvgElement('text', info['attrs'] || [], nodeGroup) as HTMLElement;
            }
        }
        stencilContainer.appendChild(svgNode);
        let txtDiv = document.createElement('div');
        txtDiv.setAttribute('class', 'stencil-text');
        txtDiv.innerHTML = models[i]['defaultText'];
        stencilContainer.appendChild(txtDiv);
    }
}

// 注册页面事件
function registerPageEvent() {
    let padding_const = 5;
    let container = document.getElementById('svgContainer');
    let scroller = document.getElementById('svgScroller');
    let svgPaper = document.getElementById('svgPaper');
    let msgTipsDiv = document.getElementById('tipsDiv');
    let splitterBtn = document.getElementById('splitterBtn');
    let stencilDiv = document.getElementById('stencilContainer');
    let mouseMenuDiv = document.getElementById('mouseMenu');
    let menuDelete = document.getElementById('menuDelete');
    let menuClone = document.getElementById('menuClone');
    let selectionDiv = document.getElementById('selectionPanel');
    let currScale = 1;
    let mouseleft, mousetop, clientX, clientY, beforeClientX, beforeClientY;
    let svgOffsetX = container.offsetLeft + padding_const;
    let svgOffsetY = container.offsetTop + padding_const;
    let stencilDivWidth = stencilDiv.offsetWidth;

    let isDragging = false;
    let isSelecting = false;
    let mouseStartX, mouseStartY;
    // 键盘事件
    document.onkeydown = function(e) {
        let currKey = 0;
        currKey = e.keyCode || e.which || e.charCode;
        if (currKey == 46) {
            // 键盘删除事件
            beforeDeleteEvent(SvgCanvas.CurrentCanvas);
        }

        if (e.ctrlKey) {
            svgPaper.style.cursor = 'default';
        }
    }

    svgPaper.onmousedown = function(e) {
        if (e.ctrlKey) {
            isSelecting = true;
            mouseStartX = e.clientX - svgOffsetX + scroller.scrollLeft;
            mouseStartY = e.clientY - svgOffsetY + scroller.scrollTop;
            selectionDiv.style.cursor = 'default';
            return;
        }
        this.style = "cursor:-webkit-grabbing;";
        isDragging = true;
        beforeClientX = e.clientX;
        beforeClientY = e.clientY;

        mouseMenuDiv.removeAttribute('style');
        msgTipsDiv.removeAttribute('style');
    }

    svgPaper.onmouseup = function(e) {
        this.style = "";
        isDragging = false;
        selectElementsBySelection();
        if (activedPageSvg.SelectedElement && activedPageSvg.SelectedElement.ElementType == 'shape') {
            let element = activedPageSvg.SelectedElement as SvgElementShapeItem;
            registerResizeHandler(element);
        } else {
            hideResizeDiv();
        }
    }

    // 鼠标移动事件，移动画布scroll
    svgPaper.onmousemove = function(e) {
        mouseleft = e.offsetX;
        mousetop = e.offsetY;
        clientX = e.clientX;
        clientY = e.clientY;
        if (isDragging && !activedPageSvg.SelectedElement) {
            let xMoved = e.clientX - beforeClientX || 0;
            let yMoved = e.clientY - beforeClientY || 0;
            scroller.scrollTop -= yMoved;
            scroller.scrollLeft -= xMoved;
            beforeClientX = e.clientX;
            beforeClientY = e.clientY;
        }
    }
    // 显示并动态改变选择框
    scroller.onmousemove = function(e) {
        clientX = e.clientX;
        clientY = e.clientY;
        if (isSelecting) {
            let mouseEndX = clientX - svgOffsetX + scroller.scrollLeft;
            let mouseEndY = clientY - svgOffsetY + scroller.scrollTop;
            // let mouseEndX = e.offsetX;
            // let mouseEndY = e.offsetY;

            let selectionWidth, selectionHeight, selectionLeft, selectionTop;
            if (mouseleft > mouseStartX) {
                selectionWidth = mouseEndX - mouseStartX;
                selectionLeft = mouseStartX;
            } else if (mouseleft < mouseStartX) {
                selectionWidth = mouseStartX - mouseEndX;
                selectionLeft = mouseEndX;
            }

            if (mousetop > mouseStartY) {
                selectionHeight = mouseEndY - mouseStartY;
                selectionTop = mouseStartY;
            } else if (mousetop < mouseStartY) {
                selectionHeight = mouseStartY - mouseEndY;
                selectionTop = mouseEndY;
            }

            selectionDiv.style.width = selectionWidth + 'px';
            selectionDiv.style.height = selectionHeight + 'px';
            selectionDiv.style.left = selectionLeft + 'px';
            selectionDiv.style.top = selectionTop + 'px';
        }
    }

    selectionDiv.onmouseup = function(e) {
        // 根据选择框的范围，选中页面元素
        selectElementsBySelection();
    }

    // 捕获鼠标滚动事件，缩放画布
    document.onmousewheel = function(e) {
        mouseMenuDiv.removeAttribute('style');
        if (e.wheelDelta && e.ctrlKey) {//IE/Opera/Chrome
            e.returnValue = false;
            scaleSvg(e.wheelDelta > 0, 0.1);
        } else if (e.detail) {//Firefox
            e.returnValue = false;
        }
    }

    scroller.onscroll = function(e) {
        mouseMenuDiv.removeAttribute('style');
    }

    // 缩进按钮点击事件
    splitterBtn.onclick = function(e) {
        let splitterDiv = e.currentTarget.parentElement;
        let splitterIcon = e.currentTarget.children[0] as HTMLElement;
        let fold = e.currentTarget.getAttribute('fold');
        let pageBar = document.getElementById('pageBar');
        if (fold == 'false') {
            stencilDiv.setAttribute('style', 'display:none;');
            splitterDiv.setAttribute('style', 'left:0;');
            container.setAttribute('style', 'left:17px;');
            splitterIcon.innerHTML = '&#xe743;';
            e.currentTarget.setAttribute('fold', 'true');
            pageBar.setAttribute('style', 'left:25px;');
        } else {
            stencilDiv.setAttribute('style', 'width:' + stencilDivWidth + 'px;');
            splitterDiv.setAttribute('style', 'left:' + stencilDivWidth + 'px;');
            container.setAttribute('style', 'left:' + (Number(stencilDivWidth) + 17) + 'px;');
            pageBar.setAttribute('style', 'left:' + (Number(stencilDivWidth) + 25) + 'px;');
            splitterIcon.innerHTML = '&#xe738;';
            e.currentTarget.setAttribute('fold', 'false');
        }

        svgOffsetX = container.offsetLeft;
        svgOffsetY = container.offsetTop;
    }

    // 拦截鼠标右键菜单
    document.oncontextmenu = function(e) {
        if (activedPageSvg.SelectedElement) {
            // 取消全选
            activedPageSvg.ClearSelectRect();
            activedPageSvg.SelectService.ClearCollection();
            activedPageSvg.SelectService.SetSelected(activedPageSvg.SelectedElement);

            mouseMenuDiv.style.display = 'block';
            let menuLeft = e.clientX, menuTop = e.clientY;
            if (menuLeft + mouseMenuDiv.clientWidth > window.innerWidth) {
                menuLeft -= mouseMenuDiv.clientWidth;
            }
            if (menuTop + mouseMenuDiv.clientHeight > window.innerHeight) {
                menuTop -= mouseMenuDiv.clientHeight;
            }
            mouseMenuDiv.style.left = menuLeft + 'px';
            mouseMenuDiv.style.top = menuTop + 'px';
            // 控制菜单显示
            if (activedPageSvg.SelectedElement.ElementType == 'shape') {
                let shapeItem = activedPageSvg.GetActivedShape();
				activedPageSvg.CreateSelectRect(shapeItem);
                let businessType = shapeItem.BusinessType;
                let isCloned = shapeItem.ClonedId ? true : false;
                let shapeDefine = SvgUtility.findItemInArray('type', businessType, stencils);
                let menuConfig = shapeDefine['mouseMenu'];
                setMenuDisplay(menuConfig, isCloned);
            } else if (activedPageSvg.SelectedElement.ElementType == 'line'){
                setMenuDisplay('delete');
            }
        }
        return false;
    }

    // 菜单点击事件
    mouseMenuDiv.onclick = function(e) {
        if (e.target.nodeName == 'LI') {
            let operate = e.target.getAttribute('operate');
            switch (operate) {
                case 'deleteNode':
                    deleteNode();
                    break;
                case 'createCopy':
                    createNodeCopy();
                    break;
            }
            mouseMenuDiv.removeAttribute('style');
        }
    }

    // 缩放svg页面
    function scaleSvg(isZoom, scaleUnit) {
        if (currScale >= 3 && isZoom || currScale <= 0.1 && !isZoom) {
            return;
        }
        if (isZoom) {
            currScale += scaleUnit;
            //currScale = currScale * (1+scaleUnit);
        } else {
            currScale -= scaleUnit;
            //currScale = currScale / (1+scaleUnit);
        }
        currScale = Number(currScale.toFixed(2));
        SvgElementModel.canvasScale = currScale;

        // set svg group scale and svg width & height
        let real_clientX = clientX - svgOffsetX;
        let real_clientY = clientY - svgOffsetY;
        let scroll_x = mouseleft * (1 + scaleUnit) - real_clientX;
        let scroll_y = mousetop * (1 + scaleUnit) - real_clientY;
        if (!isZoom) {//画布缩小时，需要计算父div的偏移量
            scroll_x = mouseleft * (1 - scaleUnit) - real_clientX;
            scroll_y = mousetop * (1 - scaleUnit) - real_clientY;
        }

        for (let i = 0; i < pageCount; i++) {
            let canvas = canvasCollection[i]['canvas'];
            canvas.ScaleCanvas(currScale);
        }

        scroller.scrollLeft = scroll_x;
        scroller.scrollTop = scroll_y;

        // show scale tips
        showScaleTips(currScale);
    }

    // 显示scale tips
    function showScaleTips(scale) {
        msgTipsDiv.innerHTML = '缩放 ' + scale.toFixed(1);
        msgTipsDiv.style.display = 'block';
    }

    // 右键菜单删除事件
    function deleteNode() {
        if (activedPageSvg.SelectedElement) {
            beforeDeleteEvent(SvgCanvas.CurrentCanvas);
        }
    }

    // 右键菜单生成副本事件
    function createNodeCopy() {
        if (activedPageSvg.SelectedElement && activedPageSvg.SelectedElement.ElementType == 'shape') {
            beforeElementCloneEvent(activedPageSvg, activedPageSvg.GetActivedShape());
        }
    }

    // 设置右键menu项的显示与隐藏
    function setMenuDisplay(config, isCloned?) {
		mouseMenuDiv.style.display = 'none';
        if (!config) {
            return;
        }
		menuDelete.removeAttribute('style');
		menuClone.removeAttribute('style');
        let operates = config.split(',');
        for (let i in operates) {
            let operate = operates[i];
            if (operate == 'delete') {
                menuDelete.style.display = 'block';
            } else if (operate == 'copy' && !isCloned) {
                menuClone.style.display = 'block';
            }
        }
		mouseMenuDiv.style.display = 'block';
    }

    // 根据选择框的范围，选中页面元素
    function selectElementsBySelection() {
        let x = selectionDiv.offsetLeft;
        let y = selectionDiv.offsetTop;
        let w = selectionDiv.clientWidth;
        let h = selectionDiv.clientHeight;
        activedPageSvg.SelectElementsByRegion(x, y, x + w, y + h);
        isSelecting = false;
        selectionDiv.removeAttribute('style');
        svgPaper.removeAttribute('style');
    }

}

function registerResizeHandler(shapeItem: SvgElementShapeItem) {

    let resizeDiv = document.getElementById("resizeDiv");
    let oL = document.getElementsByClassName('resizeL')[0];
    let oT = document.getElementsByClassName('resizeT')[0];
    let oR = document.getElementsByClassName('resizeR')[0];
    let oB = document.getElementsByClassName('resizeB')[0];
    let oLT = document.getElementsByClassName('resizeLT')[0];
    let oTR = document.getElementsByClassName('resizeTR')[0];
    let oBR = document.getElementsByClassName('resizeBR')[0];
    let oLB = document.getElementsByClassName('resizeLB')[0];
    // resize handle
    let dragMinWidth = 0;
    let dragMinHeight = 0;

    let canvasScale = activedPageSvg.CanvasScale;
    let firstElement = shapeItem.GetFirstShapeElement();
    let elementBBox = shapeItem.GetShapeBBox();
    let scale = shapeItem.Scale;
    dragMinWidth = elementBBox.width / scale[0];
    dragMinHeight = elementBBox.height / scale[1];
    let rect = shapeItem.SvgElement.getBoundingClientRect();
    let translate = shapeItem.Translate;
    resizeDiv.style.left = (translate[0] + elementBBox.x * scale[0] - 1) * canvasScale + 'px';
    resizeDiv.style.top = (translate[1] + elementBBox.y * scale[1] - 1) * canvasScale + 'px';
    resizeDiv.style.width = elementBBox.width + 'px';
    resizeDiv.style.height = elementBBox.height + 'px';
    resizeDiv.style.display = 'block';

    //四角
    resize(resizeDiv, oLT, true, true, false, false);
    resize(resizeDiv, oTR, false, true, false, false);
    resize(resizeDiv, oBR, false, false, false, false);
    resize(resizeDiv, oLB, true, false, false, false);
    //四边
    resize(resizeDiv, oL, true, false, false, true);
    resize(resizeDiv, oT, false, true, true, false);
    resize(resizeDiv, oR, false, false, false, true);
    resize(resizeDiv, oB, false, false, true, false);

    function resize(oParent, handle, isLeft, isTop, lockX, lockY) {
        handle.onmousedown = function(event) {
            // let event = event || window.event;
            let disX = event.clientX - handle.offsetLeft;
            let disY = event.clientY - handle.offsetTop;
            let iParentTop = oParent.offsetTop;
            let iParentLeft = oParent.offsetLeft;
            let iParentWidth = oParent.offsetWidth;
            let iParentHeight = oParent.offsetHeight;
            document.onmousemove = function(event) {
                let iL = event.clientX - disX;
                let iT = event.clientY - disY;
                let iW = isLeft ? iParentWidth - iL : handle.offsetWidth + iL;
                let iH = isTop ? iParentHeight - iT : handle.offsetHeight + iT;
                isLeft && (oParent.style.left = iParentLeft + iL + "px");
                isTop && (oParent.style.top = iParentTop + iT + "px");
                iW < dragMinWidth && (iW = dragMinWidth);
                lockX || (oParent.style.width = iW + "px");
                iH < dragMinHeight && (iH = dragMinHeight);
                lockY || (oParent.style.height = iH + "px");
                if ((isLeft && iW == dragMinWidth) || (isTop && iH == dragMinHeight)) document.onmousemove = null;
                if (shapeItem) {
                    let resizeW = oParent.offsetWidth;
                    let resizeH = oParent.offsetHeight;
                    activedPageSvg.ResetHandlerPanel();
                    shapeItem.Resize(resizeW, resizeH, oParent.offsetLeft, oParent.offsetTop);
                }
                return false;
            };
            document.onmouseup = function() {
                if (activedPageSvg.SelectedElement) {
                    activedPageSvg.ResetHandlerPanel(shapeItem);
                }
                document.onmousemove = null;
                document.onmouseup = null;
            };
            return false;
        }
    };

}

function hideResizeDiv() {
    let resizeDiv = document.getElementById("resizeDiv");
    resizeDiv.style.display = 'none';
}

// 导出页面数据
export function exportPageData() {
    let exportData = {};
    if (canvasCollection.length == 0) {
        return;
    }

    let pageDatas = [];
    let pageCount = canvasCollection.length;
    for (let i = 0; i < pageCount; i++) {
        let canvasItem = canvasCollection[i]['canvas'];
        let pageNo = canvasCollection[i]['pageNo'];
        let pageItem = getCanvasData(canvasItem);
        pageItem['pageNo'] = i + 1;//重新赋值pageNo
        pageDatas.push(pageItem);
    }
    exportData['pageType'] = '';
    exportData['pages'] = pageDatas;

    return JSON.stringify(exportData);
}

// 获取单个page的数据
function getCanvasData(canvas) {
    let exportData = {};
    if (!canvas) {
        return;
    }
    let allElements = canvas.GetSvgElementsInCanvas();
    let shapes = [];
    let lines = [];
    for (let i = 0; i < allElements.length; i++) {
        if (allElements[i].ElementType == 'shape') {
            let shape = allElements[i] as SvgElementShapeItem;
            let shapeSvg = shape.SvgElement.childNodes[0];
            let shapeItem = {};
            shapeItem['id'] = shape.Id;
            shapeItem['type'] = shape.BusinessType;
            shapeItem['translate'] = shape.Translate;
            let replaceStr = '"';
            shapeItem['text'] = shape.Text.replace(new RegExp(replaceStr, 'gm'), "'");
            shapeItem['businessData'] = shape.BusinessData;
            if (shape.ShapeColor) {
                shapeItem['shapeColor'] = shape.ShapeColor;
            }
            shapeItem['scale'] = shape.Scale.join(',');

            shapes.push(shapeItem);
        } else {
            let line = allElements[i] as SvgElementLineItem;
            let lineItem = {};
            lineItem['id'] = line.Id;
            lineItem['type'] = line.BusinessType;
            lineItem['text'] = line.Text;

            lineItem['opreatePoints'] = line.OperatePoints;
            lineItem['sourceId'] = line.Source.Id;
            lineItem['targetId'] = line.Target ? line.Target.Id : '';
            lineItem['businessData'] = line.BusinessData;
            lines.push(lineItem);
        }
    }

    exportData['canvas'] = {
        id: canvas.Id,
        type: '',
        width: canvas.SvgCanvasWidth,
        height: canvas.SvgCanvasHeight
    };
    exportData['shapes'] = shapes;
    exportData['lines'] = lines;
    return exportData;
}

// 导入数据
export function importPageData(data) {
    if (!data) {
        return;
    }
    resetCanvas();
    resetPageBar();

    if (typeof (data) == 'string') {
        data = JSON.parse(data);
    }
    let deleteIcon = document.getElementById('deleteIcon');
    for (let i = 0, len = data.pages.length; i < len; i++) {
        let pageData = data.pages[i];
        if (i > 0) {
            pageCount++;
            pageidx++;
            if (pageCount == 2) {
                deleteIcon.setAttribute('style', 'cursor:pointer;margin-right: 10px;display:inline-block;');
            }
            createNewSvgPage();
            createPageNumNode();
        }
        importCanvasByData(pageData);
    }
    importedDataEvent();
}

// 导入模板数据
export function importTemplateData(data) {
    if (typeof (data) == 'string') {
        data = JSON.parse(data);
    }
    let pageData = data.pages[0];
    importCanvasByData(pageData, true);

    importedTemplateEvent();
}

// 导入单个页面数据
function importCanvasByData(data, isTemplate?) {
    let canvas = data['canvas'];
    let shapes = data['shapes'];
    let lines = data['lines'];
    let svgCanvas = activedPageSvg;
    if (!isTemplate) {
        let id = canvas['id'];
        svgCanvas.Id = id;
    } else {
        svgCanvas.SelectService.ClearCollection();
        svgCanvas.ClearSelectRect();
    }
    for (let i = 0; i < shapes.length; i++) {
        let shape = shapes[i];
        let shapeInfo = matchShapeInfo(shape['type']);
        if (!shapeInfo) {
            continue;
        }

        // 去除重复元素
        if (isTemplate && svgCanvas.GetSvgElementById(shape['id'])) {
            continue
        }
        let gElement = SvgUtility.CreateSvgElement('g', [{ 'attr': 'class', 'val': 'content' }]);
        let scalableGroup = SvgUtility.CreateSvgElement('g', [{ 'attr': 'class', 'val': 'scalable' }], gElement);

        let elements = shapeInfo['elements'];
        for (let j = 0, count = elements.length; j < count; j++) {
            let item = elements[j];
            SvgUtility.CreateSvgElement(item['svgType'], item['attrs'], scalableGroup);
        }
        // 构造text node
        let textInfos = shapeInfo['texts'];
        if (textInfos) {
            for (let i = 0, len = textInfos.length; i < len; i++) {
                let info = textInfos[i];
                let textNode = SvgUtility.CreateSvgElement('text', info['attrs'] || [], gElement) as HTMLElement;
            }
        }
        let shapeItem = new SvgElementShapeItem(gElement as SVGSVGElement, svgCanvas, shape['id']);
        let shapeLinks = matchLinks(shapeInfo['links'], baseLines);
        shapeItem.Links = shapeLinks;
        shapeItem.SetTanslate(shape['translate'][0], shape['translate'][1]);
        shapeItem.BusinessType = shape['type'];
        shapeItem.BusinessData = shape['businessData'];
        if (shape['shapeColor']) {
            shapeItem.SetColor(shape['shapeColor']);
        }
        if (shape['scale']) {
            shapeItem.SetScale(shape['scale']);
        }
        let texts = (shape['text'] || '').split('|');
        if (typeof (texts) == 'object') {
            for (let k = 0; k < texts.length; k++) {
                shapeItem.SetText(texts[k], false, k);
            }
        } else {
            shapeItem.SetText(texts);
        }
        if (isTemplate) {
            svgCanvas.SelectService.AddSelected(shapeItem);
            svgCanvas.CreateSelectRect(shapeItem);
            svgCanvas.PaperFitToContent(shapeItem)
            elementAddedEvent(svgCanvas, shapeItem);
        }
    }

    for (let i = 0; i < lines.length; i++) {
        let line = lines[i];

        if (!SvgUtility.findItemInArray('businessType', line['type'], baseLines)) {
            continue;
        }
        // 去除重复元素
        let lineElement = svgCanvas.GetSvgElementById(line['id']);
        let sourceId = line['sourceId'];
        let targetId = line['targetId'];
        let opreatePoints = line['opreatePoints'];
        if (isTemplate && lineElement) {
            if (targetId) {
                let targetShape = svgCanvas.GetSvgElementById(targetId) as SvgElementShapeItem;
                lineElement.Target = targetShape;
                lineElement.UpdateOperatePoints(opreatePoints[0], opreatePoints[1]);
                lineElement.UpdateLinePath(true);
            }
            continue
        }
        let sourceShape = svgCanvas.GetSvgElementById(sourceId) as SvgElementShapeItem;
        let lineItem = new SvgElementLineItem(svgCanvas, sourceShape, line['id']);
        if (targetId) {
            let targetShape = svgCanvas.GetSvgElementById(targetId) as SvgElementShapeItem;
            lineItem.Target = targetShape;
        }
        let linkInfo = SvgUtility.findItemInArray('businessType', line['type'], baseLines);
        linkInfo['defaultText'] = line['text'];
        lineItem.InitByData(linkInfo);
        lineItem.UpdateOperatePoints(opreatePoints[0], opreatePoints[1]);
        lineItem.SetOperateOffset();
        lineItem.UpdateLinePath(true);
        lineItem.BusinessData = line['businessData'];
        if (isTemplate) {
            svgCanvas.PaperFitToContent(lineItem)
            elementAddedEvent(svgCanvas, lineItem);
        }
    }
    svgCanvas.ResetHandlerPanel();
}

// 通过业务类型得到model定义中的shape信息
function matchShapeInfo(type) {
    let modelInfo;
    let models = initParams['models'];
    for (let i = 0, len = models.length; i < len; i++) {
        if (models[i]['type'] == type) {
            modelInfo = models[i];
            break;
        }
    }
    let shapeInfo = modelInfo ? shapeDefine[modelInfo['model']] : null;
    if (shapeInfo) {
        shapeInfo['links'] = modelInfo['links'];
    }
    return shapeInfo;
}

// 匹配连线数据
function matchLinks(links, linkInfos) {
    let matchedInfos = [];
    for (let m = 0; m < links.length; m++) {
        for (let n = 0; n < linkInfos.length; n++) {
            if (links[m] == linkInfos[n]['name']) {
                matchedInfos.push(linkInfos[n]);
                break;
            }
        }
    }
    return matchedInfos;
}

// 构造画布
function createCanvasPage(el) {
    let params = initParams;
    let canvasElement = el as SVGSVGElement;
    let width: number = params.width;
    let height: number = params.height;

    let svgCanvas = new SvgCanvas(canvasElement, width, height);
    baseLines = params.lineModels;
    let models = params.models;
    if (models) {
        for (let i = 0; i < models.length; i++) {
            let modelItem = models[i];
			let isHide = modelItem['hideInStencil'];
			if (isHide){
				continue;
			}
            let element = document.getElementById(modelItem['id']);
            let model = new SvgElementModel(element);
            if (modelItem['modelType'] && modelItem['modelType'] == 'container') {
                model.ModelType = 'container';
            } else {
                let links = modelItem['links'];
                let elementLinks = matchLinks(links, baseLines);
                model.Links = elementLinks;
            }

            model.BusinessType = modelItem['type'];
            model.DefaultText = modelItem['defaultText'];
            model.ShowText = modelItem['showText'];
        }
    }
    canvasCollection.push({ 'pageNo': pageidx, 'canvas': svgCanvas });
    svgCanvas.Show();
    activedPageSvg = svgCanvas;
    registerEventHandler(svgCanvas);
}

// 初始化分页条
function initPageBar() {
    let pageDom = document.getElementById('pageBar');
    let deleteIcon = document.createElement('i');
    deleteIcon.setAttribute('id', 'deleteIcon');
    deleteIcon.setAttribute('class', 'vicons');
    deleteIcon.setAttribute('style', 'cursor:pointer;display:none;');
    deleteIcon.setAttribute('title', '删除当前活动页');
    deleteIcon.innerHTML = '&#xe6dd;';

    let addIcon = document.createElement('i');
    addIcon.setAttribute('id', 'addIcon');
    addIcon.setAttribute('class', 'vicons');
    addIcon.setAttribute('style', 'display:inline-block;cursor:pointer;');
    addIcon.setAttribute('title', '增加一页');
    addIcon.innerHTML = '&#xe6dc;';

    let pageUl = document.createElement('ul');
    pageUl.setAttribute('id', 'pageUl');
    pageUl.setAttribute('style', 'list-style: none;display:inline; padding:0;');

    pageDom.appendChild(deleteIcon);
    pageDom.appendChild(pageUl);
    pageDom.appendChild(addIcon);
    let deleteFn = function(canvasId?) {
        if (pageCount == 1) {
            return;
        }
        pageCount--;
        if (pageCount == 1) {
            deleteIcon.setAttribute('style', 'cursor:pointer;display:none;');
        }
        let delPageDom = activedPageDom;
        let delPageSvg = activedPageSvg;
        if (canvasId) {
            delPageSvg = getCanvasById(canvasId);
            delPageDom = getPageDomById(activedPageSvg.Id);
        }
        if (delPageSvg && delPageDom) {
            pageUl.removeChild(delPageDom);
            removeCanvasPage(delPageSvg);
            changePage(pageUl.firstChild);
        }
    }
    deletePageFn = deleteFn;
    deleteIcon.addEventListener('click', function(e) {
        if (runInWpf) {
            beforePageDeleteEvent();
        } else {
            deleteFn();
        }
    });

    addIcon.addEventListener('click', function(e) {
        if (pageCount == 1) {
            deleteIcon.setAttribute('style', 'cursor:pointer;margin-right: 10px;display:inline-block;');
        }
        pageCount++;
        pageidx++;
        createPageNumNode();
        createNewSvgPage();
    });
    createPageNumNode();
}
// 构造分页node
function createPageNumNode() {
    let pageUl = document.getElementById('pageUl');
    if (activedPageDom) {
        activedPageDom.setAttribute('class', 'page-num');
    }
    let numNode = document.createElement('li');
    numNode.setAttribute('class', 'page-num-selected');
    numNode.setAttribute('style', 'cursor:pointer');
    numNode.setAttribute('name', 'pageNo');
    numNode.setAttribute('page', pageidx.toString());
    numNode.innerHTML = pageidx.toString();
    pageUl.appendChild(numNode);
    activedPageDom = numNode;
    numNode.addEventListener('click', function(e) {
        changePage(this);
    });
    return numNode;
}
// 创建一个新的svg页面
function createNewSvgPage(svgNode?: Element) {
    if (activedPageSvg) {
        activedPageSvg.Hide();
    }
    let svgPaper = document.getElementById('svgPaper');
    // activedPageSvg
    if (!svgNode) {
        svgNode = SvgUtility.CreateSvgElement('svg', { 'class': 'svgCanvas' }, svgPaper);
    }
    createCanvasPage(svgNode);
    canvasPageAddedEvent();
}
// 更改svg页面
function changePage(target) {
    if (activedPageDom) {
        activedPageDom.setAttribute('class', 'page-num');
    }
    activedPageDom = target;
    activedPageDom.setAttribute('class', 'page-num-selected');
    let activedIdx = activedPageDom.getAttribute('page');
    let pageCount = canvasCollection.length;
    for (let i = 0; i < pageCount; i++) {
        let canvasItem = canvasCollection[i]['canvas'];
        if (canvasCollection[i]['pageNo'] == activedIdx) {
            canvasItem.Show();
            activedPageSvg = canvasItem;
        } else {
            canvasItem.Hide();
        }
    }
    changedPageEvent();
}
// 删除svg页面
function removeCanvasPage(pageSvg) {
    let pageCount = canvasCollection.length;
    for (let i = 0; i < pageCount; i++) {
        let canvasItem = canvasCollection[i]['canvas'];
        if (canvasItem == pageSvg) {
            canvasCollection.splice(i, 1);
            break;
        }
    }
    pageSvg.Distory();
    canvasPageDeletedEvent(pageSvg.Id);
}

// 获取画布对象
function getCanvasById(id) {
    let len = canvasCollection.length;
    if (len == 1) {
        return canvasCollection[0]['canvas'];
    }
    for (let i = 0; i < len; i++) {
        if (canvasCollection[i].canvas.Id == id) {
            return canvasCollection[i]['canvas'];
        }
    }
}

// 获取画布编号
function getPageNoById(canvasId) {
    let len = canvasCollection.length;
    if (len == 1) {
        return canvasCollection[0]['canvas'];
    }
    for (let i = 0; i < len; i++) {
        if (canvasCollection[i].canvas.Id == canvasId) {
            return canvasCollection[i]['pageNo'];
        }
    }
}

// 获取page 分页 dom
function getPageDomById(canvasId) {
    let pageNo = getPageNoById(canvasId);
    let pageUl = document.getElementById('pageUl');
    let liDoms = pageUl.childNodes;
    for (let i in liDoms) {
        let item = liDoms[i] as HTMLElement;
        let no = item.getAttribute('page');
        if (no == pageNo) {
            return item;
        }
    }
}

// 重置svg画布为初始化状态
function resetCanvas() {
    let pageCount = canvasCollection.length;
    for (let i = 0; i < pageCount; i++) {
        let canvasItem = canvasCollection[i]['canvas'];
        canvasItem.Distory();
    }
    canvasCollection = [];
    createNewSvgPage();
}
// 重置分页控件为初始化状态
function resetPageBar() {
    let pageDom = document.getElementById('pageBar');
    let nodes = pageDom.childNodes;
    while (nodes.length > 0) {
        pageDom.removeChild(nodes[0]);
    }
    pageCount = 1;
    pageidx = 1;
    initPageBar();
}

// WPF-->JS
// handle wpf message start
export function handleWpfMessage(message): string {
    try {
        if (typeof (message) == 'string') {
            message = eval("(" + message + ")");
        }
        let result = '1';
        switch (message.MessageType) {
            case "getExportData":
                result = exportPageData();
                break;
            case "getExportImg":
                exportImgData();
                break;
            case "updateNodeText":
                updateNodeText(message['MessageContent']);
                break;
            case "updateNodeData":
                updateNodeData(message['MessageContent']);
                break;
            case "updateShapeColor":
                updateShapeColor(message['MessageContent']);
                break;
            case "delete":
                deleteNodeById(message['MessageContent']);
                break;
            case "importData":
                importPageData(message['MessageContent']['content']);
                break;
            case "importTemplateData":
                importTemplateData(message['MessageContent']['content']);
                break;
            case "getLinesByShape":
                result = getLinesByShape(message['MessageContent']);
                break;
            case "getShapesByLine":
                result = getShapesByLine(message['MessageContent']);
                break;
            case "getAllElement":
                result = getAllElement(message['MessageContent']);
                break;
            case "changeElement":
                changeElement(message['MessageContent']);
                break;
            // before connect element result
            case "connectElements":
                connectElements(message['MessageContent']);
                break;
            // before clone element result
            case "cloneElement":
                cloneElement(message['MessageContent']);
                break;
            // before break connection result
            case "breakTargetConnection":
                breakTargetConnection(message['MessageContent']);
                break;
            // before delete page result
            case "deletePage":
                deleteCurrPage(message['MessageContent']);
                break;
            // WPF msg
            case "wpfMsg":
                handleWpfMsg(message['MessageContent']);
                break;
            case 'selectElement':
                selectElement(message['MessageContent']);
                break;
            case 'createShapeElement':
                result = createShapeElement(message['MessageContent']);
                break;
            case 'createLineElement':
                result = createLineElement(message['MessageContent']);
                break;
            // 设置图形缩放比例
            case 'setShapeScale':
                setShapeScale(message['MessageContent']);
                break;
            default:
                break;
        }
        return result;
    } catch (err) {
        alert('wpf message error: ' + err);
    }
}

// 获取导出Img数据
export function exportImgData() {
    let svgDefs = document.getElementById('svgDefs').cloneNode(true);
    SvgUtility.GetSvgAsImg(activedPageSvg, baseLines, svgDefs, function(data) {
        let messageType = 'exportImgData';
        let content = {
            dataType: 'base64',
            dataContent: data.substring(data.indexOf(',') + 1)
        }
        console.log(data);
        submitWPF(messageType, content);
    });
}

// 更新元素数据
function updateNodeData(data) {
    let canvasId = data['canvasId'];
    let nodeId = data['nodeId'];
    let dataNo = data['dataNo'];
    let businessData = data['data'];
    let canvas = getCanvasById(canvasId);
    canvas.UpdateElementData(nodeId, dataNo, businessData);
}

// 更新元素text
export function updateNodeText(data) {
    let canvasId = data['canvasId'];
    let nodeId = data['nodeId'];
    let text = data['nodeText'];
    let index = data['textIndex'] || '0';
    let canvas = getCanvasById(canvasId);
    canvas.UpdateElementText(nodeId, text, index);
}

// 更新图形颜色
export function updateShapeColor(data) {
    let canvasId = data['canvasId'];
    let nodeId = data['nodeId'];
    let color = data['color'];
    let canvas = getCanvasById(canvasId);
    let shapeItem = canvas.GetSvgElementById(nodeId);
    if (!shapeItem) {
        return;
    }
    shapeItem.SetColor(color);
}

// 获取与指定shape相关连的线
function getLinesByShape(data) {
    let canvasId = data['canvasId'];
    let nodeId = data['nodeId'];
    let canvas = getCanvasById(canvasId);
    let shapeItem = canvas.GetSvgElementById(nodeId);
    if (!shapeItem) {
        return '';
    }
    let lines = shapeItem.GetElementLines();

    // lines.sourceLines,lines.targetLines;
    let result;
    let outLines = [];
    let inLines = [];
    for (let i = 0, len = lines.sourceLines.length; i < len; i++) {
        let line = lines.sourceLines[i];
        let lineItem = {
            nodeId: line.Id,
            nodeText: line.Text || '',
            nodeType: 'line',
            businessType: line.BusinessType,
            businessData: line.BusinessData
        };
        outLines.push(lineItem);
    }

    for (let i = 0, len = lines.targetLines.length; i < len; i++) {
        let line = lines.targetLines[i];
        let lineItem = {
            nodeId: line.Id,
            nodeText: line.Text || '',
            nodeType: 'line',
            businessType: line.BusinessType,
            businessData: line.BusinessData
        };
        inLines.push(lineItem);
    }

    result = {
        outLines: outLines,
        inLines: inLines
    }
    return JSON.stringify(result);
}

// 获取与指定line相关连的图形
function getShapesByLine(data) {
    let canvasId = data['canvasId'];
    let nodeId = data['nodeId'];
    let canvas = getCanvasById(canvasId);
    let lineItem = canvas.GetSvgElementById(nodeId);
    if (!lineItem) {
        return '';
    }
    lineItem.Source, lineItem.Target;
    let result = {
        sourceShape: {
            nodeId: lineItem.Source.Id,
            clonedId: lineItem.Source.ClonedId || '',
            nodeText: lineItem.Source.Text || '',
            nodeType: 'shape',
            businessType: lineItem.Source.BusinessType,
            businessData: lineItem.Source.BusinessData
        },
        targetShape: lineItem.Target == undefined || null ? '' : {
            nodeId: lineItem.Target.Id,
            clonedId: lineItem.Target.ClonedId || '',
            nodeText: lineItem.Target.Text || '',
            nodeType: 'shape',
            businessType: lineItem.Target.BusinessType,
            businessData: lineItem.Target.BusinessData
        }
    }
    return JSON.stringify(result);
}

// 获取指定canvas中所有的元素
function getAllElement(data) {
    let canvasId = data['canvasId'];
    let canvas = getCanvasById(canvasId);
    let elementCollection = canvas.GetSvgElementsInCanvas();
    let elements = [];
    for (let i = 0, len = elementCollection.length; i < len; i++) {
        let item = elementCollection[i];
        let elementItem = {
            nodeId: item.Id,
            clonedId: item.ClonedId || '',
            nodeText: item.Text || '',
            nodeType: item.ElementType,
            businessType: item.BusinessType,
            businessData: item.BusinessData
        };
        elements.push(elementItem);
    }
    let result = {
        elements: elements
    }
    return JSON.stringify(result);
}

// 改变指定的元素
function changeElement(data) {
    let canvasId = data['canvasId'];
    let elementId = data['nodeId'];
    let targetType = data['targetType'];
    if (!canvasId || !elementId || !targetType) {
        return;
    }
    let canvas = getCanvasById(canvasId);
    let selectedElement = canvas.GetSvgElementById(elementId);
    if (!selectedElement) {
        return;
    }
    let nodeType = selectedElement.ElementType;
    if (nodeType == 'shape') {
        let transform = selectedElement.SvgElement.getAttribute('transform');
        canvas.groupElement.removeChild(selectedElement.SvgElement);
        let targetInfo = SvgUtility.findItemInArray('type', targetType, stencils);
        let shapeInfo = shapeDefine[targetInfo['model']];
        let shapes = shapeInfo['elements'];
        let gAttrs = [{ attr: 'class', val: 'Content' }, { attr: 'transform', val: transform }];
        let nodeGroup = SvgUtility.CreateSvgElement('g', gAttrs, canvas.groupElement);
        let scalableGroup = SvgUtility.CreateSvgElement('g', [{ 'attr': 'class', 'val': 'scalable' }], nodeGroup);
        for (let j = 0, count = shapes.length; j < count; j++) {
            let item = shapes[j];
            SvgUtility.CreateSvgElement(item['svgType'], item['attrs'], scalableGroup);
        }
        let textNode = SvgUtility.CreateSvgElement('text', shapeInfo['text']['attrs'], nodeGroup) as HTMLElement;
        if (targetInfo['showText']) {
            textNode.innerHTML = targetInfo['defaultText'] || '';
        } else {
            textNode.setAttribute('display', 'none');
        }
        selectedElement.SvgElement = nodeGroup as SVGSVGElement;
        selectedElement.BusinessType = targetType;
        selectedElement.RegisterEvent();
    } else {
        let targetInfo = SvgUtility.findItemInArray('businessType', targetType, baseLines);
        selectedElement.SvgElement.children[0].setAttribute('class', targetInfo['class']);
        selectedElement.BusinessType = targetType;
    }
}

// 删除元素
function deleteNodeById(data) {
    let canvasId = data['canvasId'];
    let nodeIds = data['nodeIds'];
    let canvas = getCanvasById(canvasId);
    let ids = nodeIds.split(',');
    canvas.RemoveElementsByIds(ids);
}

// 连接图形元素
function connectElements(data) {
    let canvasId = data['canvasId'];
    let targetNodeId = data['targetNodeId'];
    let lineId = data['lineId'];
    let canvas = getCanvasById(canvasId);
    canvas.ConnectElements(targetNodeId, lineId);
}

// 生成图形副本
function cloneElement(data) {
    let canvasId = data['canvasId'];
    let nodeId = data['nodeId'];
    let canvas = getCanvasById(canvasId);
    let shape = canvas.GetSvgElementById(nodeId);
    if (shape) {
        canvas.CloneShapeElement(shape);
    }
}

// 断开线的target连接
function breakTargetConnection(data) {
    let canvasId = data['canvasId'];
    let lineId = data['lineId'];
    let canvas = getCanvasById(canvasId);
    let line = canvas.GetSvgElementById(lineId);
    if (line) {
        line.RemoveTarget();
        breakedConnectionEvent(canvas, line);
    }
}

// 删除当前page页
function deleteCurrPage(data) {
    let canvasId = data['canvasId'];
    deletePageFn(canvasId);
}

// 处理WPF msg
function handleWpfMsg(data) {
    let msg = data['msg'];
    alert(msg);
}

// 选中单个元素
function selectElement(data) {
    let canvasId = data['canvasId'];
    let nodeId = data['nodeId'];
    let canvas = getCanvasById(canvasId);
    let element = canvas.GetSvgElementById(nodeId);
    // 触发选中后事件
    // 设置画布上的选中
    canvas.SelectedElement = element;
    if (element.ElementType == 'shape') {
        element.IsSelected = true;
        canvas.SelectService.SetSelected(element);
        canvas.ClearSelectRect();
        canvas.CreateSelectRect(element);
    } else {
        canvas.SelectService.ClearCollection();
        canvas.ClearSelectRect();
    }
    canvas.ResetHandlerPanel(element);
}

// 生成图形元素
export function createShapeElement(data) {
    let canvasId = data['canvasId'];
    let businessType = data['businessType'];
    let positionX = data['positionX'];
    let positionY = data['positionY'];
    let canvas = getCanvasById(canvasId);

    let gElement = SvgUtility.CreateSvgElement('g', [{ 'attr': 'class', 'val': 'content' }]);
    let scalableGroup = SvgUtility.CreateSvgElement('g', [{ 'attr': 'class', 'val': 'scalable' }], gElement);
    let shapeInfo = matchShapeInfo(businessType);
    if (!shapeInfo) {
        return;
    }

    // create svg elements in defined
    let elements = shapeInfo['elements'];
    for (let j = 0, count = elements.length; j < count; j++) {
        let item = elements[j];
        SvgUtility.CreateSvgElement(item['svgType'], item['attrs'], scalableGroup);
    }
    let textNode = SvgUtility.CreateSvgElement('text', shapeInfo['text']['attrs'], gElement) as HTMLElement;
    let shapeItem = new SvgElementShapeItem(gElement as SVGSVGElement, canvas);
    let shapeLinks = matchLinks(shapeInfo['links'], baseLines);
    shapeItem.Links = shapeLinks;
    shapeItem.SetTanslate(positionX, positionY);
    shapeItem.BusinessType = businessType;
    canvas.PaperFitToContent(shapeItem);

    let result = {
        shape: {
            nodeId: shapeItem.Id,
            clonedId: '',
            nodeText: '',
            nodeType: 'shape',
            businessType: businessType,
            businessData: shapeItem.BusinessData
        }
    };

    return JSON.stringify(result);
}


// 生成线并连接图形元素
export function createLineElement(data) {
    let canvasId = data['canvasId'];
    let businessType = data['businessType'];
    let sourceId = data['sourceId'];
    let targetId = data['targetId'];
    let canvas = getCanvasById(canvasId);

    let lineId = SvgUtility.uuid();
    let sourceShape = canvas.GetSvgElementById(sourceId) as SvgElementShapeItem;
    let targetShape = canvas.GetSvgElementById(targetId) as SvgElementShapeItem;
    if (!sourceShape || !targetShape) {
        return;
    }
    let lineItem = new SvgElementLineItem(canvas, sourceShape, lineId);
    lineItem.Target = targetShape;
    let linkInfo = SvgUtility.findItemInArray('businessType', businessType, baseLines);
    lineItem.InitByData(linkInfo);
    lineItem.CreateStraightLine();

    let result = {
        line: {
            nodeId: lineItem.Id,
            nodeText: '',
            nodeType: 'line',
            businessType: businessType,
            businessData: lineItem.BusinessData
        }
    };

    return JSON.stringify(result);
}

function setShapeScale(data) {
    let canvasId = data['canvasId'];
    let nodeId = data['nodeId'];
    let scale = data['scale'];
    let canvas = getCanvasById(canvasId);
    let element = canvas.GetSvgElementById(nodeId);
    if (element && element.ElementType == 'shape') {
        let shape = element as SvgElementShapeItem;
        shape.SetScale(scale);
    }
}

// handle wpf message end

// JS-->WPF
// event handle start
// 对canvas注册WPF通信事件
function registerEventHandler(canvas) {
    canvas.beforeConnectEvent = beforeConnectEvent;
    canvas.elementConnectedEvent = elementConnectedEvent;
    canvas.elementClonedEvent = elementClonedEvent;
    canvas.elementSelectedEvent = elementSelectedEvent;
    canvas.elementDeletedEvent = elementDeletedEvent;
    canvas.cancelSelectEvent = cancelSelectEvent;
    canvas.beforeBreakConnectionEvent = beforeBreakConnectionEvent;
}

// 连接前事件
function beforeConnectEvent(canvas, line, targetShape) {
    let messageType = "beforeConnect";
    if (!runInWpf) {
        canvas.ConnectElements(targetShape.Id, line.Id);
        return;
    }
    let sourceShape = line.Source;
    let messageContent = {
        canvasId: canvas.Id,
        sourceClonedId: sourceShape.ClonedId || '',
        sourceNodeId: sourceShape.Id,
        sourceNodeText: sourceShape.Text || '',
        sourceNodeType: sourceShape.ElementType,
        sourceBusinessType: sourceShape.BusinessType,
        sourceBusinessData: sourceShape.BusinessData,
        targetClonedId: targetShape.ClonedId || '',
        targetNodeId: targetShape.Id,
        targetNodeText: targetShape.Text || '',
        targetNodeType: targetShape.ElementType,
        targetBusinessType: targetShape.BusinessType,
        targetBusinessData: targetShape.BusinessData,
        lineId: line.Id,
        lineText: line.Text || '',
        lineNodeType: line.ElementType,
        lineBusinessType: line.BusinessType,
        lineBusinessData: line.BusinessData
    };
    submitWPF(messageType, messageContent);
}

// 删除前事件
function beforeDeleteEvent(canvas) {
    let selectedElement = canvas.SelectedElement;
    let selectedElements = canvas.SelectService.GetSelectableCollection();
    let deleteElements = [];
    let selectedCount = selectedElements.length;
    if (!selectedElement && selectedCount == 0) {
        return
    } else if (selectedCount > 0) {
        for (let i = 0; i < selectedCount; i++) {
            let shapeItem = selectedElements[i] as SvgElementShapeItem;
            let lines = shapeItem.GetElementLines();
            deleteElements.push(shapeItem);
            deleteElements = deleteElements.concat(lines['sourceLines']);
        }
    } else {
        let lineItem = selectedElement as SvgElementLineItem;
        deleteElements.push(lineItem);
    }

    if (!runInWpf) {
        if (selectedCount > 0) {
            canvas.RemoveElements(selectedElements);
        } else {
            canvas.RemoveElements([selectedElement]);
        }
        return;
    }
    let elementArray = [];
    for (let i = 0, len = deleteElements.length; i < len; i++) {
        let element = deleteElements[i];
        let item = {
            canvasId: canvas.Id,
            clonedId: element.ClonedId || '',
            nodeId: element.Id,
            nodeType: element.ElementType,
            nodeText: element.Text || '',
            businessType: element.BusinessType,
            businessData: element.BusinessData
        };
        elementArray.push(item);
    }

    let messageType = "beforeDelete";
    let messageContent = {
        elements: elementArray
    };
    submitWPF(messageType, messageContent);
}

// 连接后事件
function elementConnectedEvent(canvas, line, targetShape) {
    if (!runInWpf) {
        return;
    }
    let messageType = "elementConnected";
    let sourceShape = line.Source;
    let messageContent = {
        canvasId: canvas.Id,
        sourceClonedId: sourceShape.ClonedId || '',
        sourceNodeId: sourceShape.Id,
        sourceNodeText: sourceShape.Text || '',
        sourceNodeType: sourceShape.ElementType,
        sourceBusinessType: sourceShape.BusinessType,
        sourceBusinessData: sourceShape.BusinessData,
        targetClonedId: targetShape.ClonedId || '',
        targetNodeId: targetShape.Id,
        targetNodeText: targetShape.Text || '',
        targetNodeType: targetShape.ElementType,
        targetBusinessType: targetShape.BusinessType,
        targetBusinessData: targetShape.BusinessData,
        lineId: line.Id,
        lineText: line.Text || '',
        lineNodeType: line.ElementType,
        lineBusinessType: line.BusinessType,
        lineBusinessData: line.BusinessData
    };
    submitWPF(messageType, messageContent);
}

// 增加后事件
function elementAddedEvent(canvas, element) {
    if (!runInWpf) {
        // 设置画布上的选中
        canvas.SelectedElement = element;
        if (element.ElementType == 'shape') {
            element.IsSelected = true;
            canvas.SelectService.SetSelected(element);
            canvas.ClearSelectRect();
            canvas.CreateSelectRect(element);
            registerResizeHandler(element);
        } else {
            canvas.SelectService.ClearCollection();
            canvas.ClearSelectRect();
            hideResizeDiv();
        }
        canvas.ResetHandlerPanel(element);
        return;
    }
    let messageType = "elementAdded";
    let messageContent = {
        canvasId: canvas.Id,
        clonedId: element.ClonedId || '',
        nodeId: element.Id,
        nodeType: element.ElementType,
        nodeText: element.Text || '',
        businessType: element.BusinessType,
        businessData: element.BusinessData
    };
    submitWPF(messageType, messageContent);
}

// 选中后事件
function elementSelectedEvent(canvas, element) {
    if (!runInWpf) {
        return;
    }
    let messageType = "selected";
    let messageContent = {
        canvasId: canvas.Id,
        clonedId: element.ClonedId || '',
        nodeId: element.Id,
        nodeType: element.ElementType,
        nodeText: element.Text || '',
        businessType: element.BusinessType,
        businessData: element.BusinessData
    };
    submitWPF(messageType, messageContent);
}

// 删除后事件
function elementDeletedEvent(canvas) {
    if (!runInWpf) {
        canvas.SelectedElement = null;
        canvas.SelectService.ClearCollection();
        return;
    }

    let selectedElement = canvas.SelectedElement;
    let selectedElements = canvas.SelectService.GetSelectableCollection();
    let deleteElements = [];
    let selectedCount = selectedElements.length;
    if (selectedCount > 0) {
        for (let i = 0; i < selectedCount; i++) {
            let shapeItem = selectedElements[i] as SvgElementShapeItem;
            let lines = shapeItem.GetElementLines();
            deleteElements.push(shapeItem);
            deleteElements = deleteElements.concat(lines['sourceLines']);
        }
    } else {
        let lineItem = selectedElement as SvgElementLineItem;
        deleteElements.push(lineItem);
    }

    let elementArray = [];
    for (let i = 0, len = deleteElements.length; i < len; i++) {
        let element = deleteElements[i];
        let item = {
            canvasId: canvas.Id,
            clonedId: element.ClonedId || '',
            nodeId: element.Id,
            nodeType: element.ElementType,
            nodeText: element.Text || '',
            businessType: element.BusinessType,
            businessData: element.BusinessData
        };
        elementArray.push(item);
    }
    canvas.SelectedElement = null;
    canvas.SelectService.ClearCollection();

    let messageType = "deleted";
    let messageContent = {
        elements: elementArray
    };
    submitWPF(messageType, messageContent);
}

// 取消选中事件
function cancelSelectEvent() {
    hideResizeDiv();
    if (!runInWpf) {
        return;
    }
    let messageType = "cancelSelect";
    let messageContent = "OK";
    submitWPF(messageType, messageContent);
}

// 发送导入数据结果事件
function importedDataEvent() {
    let messageType = "importDataResult";
    let messageContent = "OK";
    submitWPF(messageType, messageContent);
}

// 发送导入模板结果事件
function importedTemplateEvent() {
    let messageType = "importTemplateResult";
    let messageContent = "OK";
    submitWPF(messageType, messageContent);
}

// 生成副本前事件
function beforeElementCloneEvent(canvas, shape) {
    let messageType = "beforClone";
    if (!runInWpf) {
        canvas.CloneShapeElement(shape);
        return;
    }
    let messageContent = {
        canvasId: canvas.Id,
        clonedId: shape.ClonedId || '',
        nodeId: shape.Id,
        nodeText: shape.Text || '',
        nodeType: shape.ElementType,
        businessType: shape.BusinessType,
        businessData: shape.BusinessData
    };
    submitWPF(messageType, messageContent);
}

// 生成副本后事件
function elementClonedEvent(canvas, clonedShape) {
    if (!runInWpf) {
        return;
    }
    let messageType = "cloned";
    let messageContent = {
        canvasId: canvas.Id,
        clonedId: clonedShape.ClonedId || '',
        nodeId: clonedShape.Id,
        nodeType: clonedShape.ElementType,
        nodeText: clonedShape.Text || '',
        businessType: clonedShape.BusinessType,
        businessData: clonedShape.BusinessData
    };
    submitWPF(messageType, messageContent);
}

// 断开连接前事件
function beforeBreakConnectionEvent(canvas, line, targetShape) {
    let messageType = "beforeBreakConnection";
    if (!runInWpf) {
        line.RemoveTarget();
        return;
    }
    let sourceShape = line.Source;
    let messageContent = {
        canvasId: canvas.Id,
        sourceClonedId: sourceShape.ClonedId || '',
        sourceNodeId: sourceShape.Id,
        sourceNodeText: sourceShape.Text || '',
        sourceNodeType: sourceShape.ElementType,
        sourceBusinessType: sourceShape.BusinessType,
        sourceBusinessData: sourceShape.BusinessData,
        targetClonedId: targetShape.ClonedId,
        targetNodeId: targetShape.Id,
        targetNodeText: targetShape.Text || '',
        targetNodeType: targetShape.ElementType,
        targetBusinessType: targetShape.BusinessType,
        targetBusinessData: targetShape.BusinessData,
        lineId: line.Id,
        lineText: line.Text || '',
        lineNodeType: line.ElementType,
        lineBusinessType: line.BusinessType,
        lineBusinessData: line.BusinessData
    };
    submitWPF(messageType, messageContent);
}

// 断开连接后事件
function breakedConnectionEvent(canvas, line) {
    let messageType = "breakedConnection";
    if (!runInWpf) {
        return;
    }
    let sourceShape = line.Source;
    let messageContent = {
        canvasId: canvas.Id,
        sourceClonedId: sourceShape.ClonedId || '',
        sourceNodeId: sourceShape.Id,
        sourceNodeText: sourceShape.Text || '',
        sourceNodeType: sourceShape.ElementType,
        sourceBusinessType: sourceShape.BusinessType,
        sourceBusinessData: sourceShape.BusinessData,
        lineId: line.Id,
        lineText: line.Text || '',
        lineNodeType: line.ElementType,
        lineBusinessType: line.BusinessType,
        lineBusinessData: line.BusinessData
    };
    submitWPF(messageType, messageContent);
}
// 页面加载后事件
export function onloadEvent() {
    if (!runInWpf || !submitWPF) {
        return;
    }
    let messageType = "webOnload";
    let messageContent = {
        canvasId: activedPageSvg.Id
    };
    submitWPF(messageType, messageContent);
}

// 增加页签前后事件
function canvasPageAddedEvent() {
    if (!runInWpf || !submitWPF) {
        return;
    }
    let messageType = "pageAdded";
    let messageContent = {
        canvasId: activedPageSvg.Id
    };
    submitWPF(messageType, messageContent);
}

// 删除页签前事件
function beforePageDeleteEvent() {
    let messageType = "beforePageDelete";
    let messageContent = {
        canvasId: activedPageSvg.Id
    };
    submitWPF(messageType, messageContent);
}

// 增加页签前后事件
function canvasPageDeletedEvent(canvasId) {
    if (!runInWpf) {
        return;
    }
    let messageType = "pageDeleted";
    let messageContent = {
        canvasId: canvasId
    };
    submitWPF(messageType, messageContent);
}

// 切换页签后事件
function changedPageEvent() {
    if (!runInWpf) {
        return;
    }
    let messageType = "pageChanged";
    let messageContent = {
        canvasId: activedPageSvg.Id
    };
    submitWPF(messageType, messageContent);
}
// event handle end
