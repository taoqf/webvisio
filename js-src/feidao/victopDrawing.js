define(["require", "exports", './SvgCanvas', './SvgElementModel', './SvgElementModel', './SvgElement', './SvgElement', './SvgElement', './SvgUtility'], function (require, exports, SvgCanvas_1, SvgElementModel_1, SvgElementModel_2, SvgElement_1, SvgElement_2, SvgElement_3, SvgUtility_1) {
    var initParams;
    var canvasCollection = [];
    var stencils = [];
    var baseLines = [];
    var pageCount = 1;
    var pageidx = 1;
    var activedPageDom;
    var shapeDefine;
    var elementSelected = false;
    var runInWpf = false;
    var deletePageFn;
    // 初始化页面
    function initCanvas(params) {
        initParams = params;
        shapeDefine = params['shapeDefine'];
        stencils = params['models'];
        initStencilArea(stencils);
        runInWpf = params['runInWpf'] || false;
        createNewSvgPage();
        initPageBar();
        SvgElement_1.registerElementAddedEvent(elementAddedEvent);
        SvgElementModel_2.registerElementCreateEvent(elementAddedEvent);
        registerPageEvent();
    }
    exports.initCanvas = initCanvas;
    // 初始化模板区
    function initStencilArea(models) {
        var stencilContainer = document.getElementById('stencilContainer');
        if (!stencilContainer) {
            return false;
        }
        var gAttrs = [{ attr: 'class', val: 'Content' }];
        for (var i = 0, len = models.length; i < len; i++) {
            var shapeInfo = shapeDefine[models[i]['model']];
            var shapes = shapeInfo['elements'];
            var svgAttrs = [{ attr: 'id', val: models[i]['id'] }, { attr: 'width', val: shapeInfo['width'] },
                { attr: 'height', val: shapeInfo['height'] }, { attr: 'style', val: 'margin:auto;' }, { attr: 'display', val: 'block' }];
            var svgNode = SvgUtility_1.default.CreateSvgElement('svg', svgAttrs, stencilContainer);
            var globalNode = SvgUtility_1.default.CreateSvgElement('g', gAttrs, svgNode);
            for (var j = 0, count = shapes.length; j < count; j++) {
                var item = shapes[j];
                SvgUtility_1.default.CreateSvgElement(item['svgType'], item['attrs'], globalNode);
            }
            var textNode = SvgUtility_1.default.CreateSvgElement('text', shapeInfo['text']['attrs'], globalNode);
            stencilContainer.appendChild(svgNode);
            var txtDiv = document.createElement('div');
            txtDiv.setAttribute('class', 'stencil-text');
            txtDiv.innerHTML = models[i]['defaultText'];
            stencilContainer.appendChild(txtDiv);
        }
    }
    // 注册页面事件
    function registerPageEvent() {
        var padding_const = 5;
        var container = document.getElementById('svgContainer');
        var scroller = document.getElementById('svgScroller');
        var svgPaper = document.getElementById('svgPaper');
        var msgTipsDiv = document.getElementById('tipsDiv');
        var splitterBtn = document.getElementById('splitterBtn');
        var stencilDiv = document.getElementById('stencilContainer');
        var mouseMenuDiv = document.getElementById('mouseMenu');
        var menuDelete = document.getElementById('menuDelete');
        var menuClone = document.getElementById('menuClone');
        var selectionDiv = document.getElementById('selectionPanel');
        var currScale = 1;
        var mouseleft, mousetop, clientX, clientY, beforeClientX, beforeClientY;
        var svgOffsetX = container.offsetLeft + padding_const;
        var svgOffsetY = container.offsetTop + padding_const;
        var stencilDivWidth = stencilDiv.offsetWidth;
        var isDragging = false;
        var isSelecting = false;
        var mouseStartX, mouseStartY;
        // 键盘事件
        document.onkeydown = function (e) {
            var currKey = 0;
            currKey = e.keyCode || e.which || e.charCode;
            if (currKey == 46) {
                // 键盘删除事件
                beforeDeleteEvent(SvgCanvas_1.SvgCanvas.CurrentCanvas);
            }
            if (e.ctrlKey) {
                svgPaper.style.cursor = 'default';
            }
        };
        svgPaper.onmousedown = function (e) {
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
        };
        svgPaper.onmouseup = function (e) {
            this.style = "";
            isDragging = false;
            selectElementsBySelection();
        };
        // 鼠标移动事件，移动画布scroll
        svgPaper.onmousemove = function (e) {
            mouseleft = e.offsetX;
            mousetop = e.offsetY;
            clientX = e.clientX;
            clientY = e.clientY;
            if (isDragging && !elementSelected) {
                var xMoved = e.clientX - beforeClientX || 0;
                var yMoved = e.clientY - beforeClientY || 0;
                scroller.scrollTop -= yMoved;
                scroller.scrollLeft -= xMoved;
                beforeClientX = e.clientX;
                beforeClientY = e.clientY;
            }
        };
        // 显示并动态改变选择框
        scroller.onmousemove = function (e) {
            clientX = e.clientX;
            clientY = e.clientY;
            if (isSelecting) {
                var mouseEndX = clientX - svgOffsetX + scroller.scrollLeft;
                var mouseEndY = clientY - svgOffsetY + scroller.scrollTop;
                // let mouseEndX = e.offsetX;
                // let mouseEndY = e.offsetY;
                var selectionWidth, selectionHeight, selectionLeft, selectionTop;
                if (mouseleft > mouseStartX) {
                    selectionWidth = mouseEndX - mouseStartX;
                    selectionLeft = mouseStartX;
                }
                else if (mouseleft < mouseStartX) {
                    selectionWidth = mouseStartX - mouseEndX;
                    selectionLeft = mouseEndX;
                }
                if (mousetop > mouseStartY) {
                    selectionHeight = mouseEndY - mouseStartY;
                    selectionTop = mouseStartY;
                }
                else if (mousetop < mouseStartY) {
                    selectionHeight = mouseStartY - mouseEndY;
                    selectionTop = mouseEndY;
                }
                selectionDiv.style.width = selectionWidth + 'px';
                selectionDiv.style.height = selectionHeight + 'px';
                selectionDiv.style.left = selectionLeft + 'px';
                selectionDiv.style.top = selectionTop + 'px';
            }
        };
        selectionDiv.onmouseup = function (e) {
            // 根据选择框的范围，选中页面元素
            selectElementsBySelection();
        };
        // 捕获鼠标滚动事件，缩放画布
        document.onmousewheel = function (e) {
            mouseMenuDiv.removeAttribute('style');
            if (e.wheelDelta && e.ctrlKey) {
                e.returnValue = false;
                scaleSvg(e.wheelDelta > 0, 0.1);
            }
            else if (e.detail) {
                e.returnValue = false;
            }
        };
        scroller.onscroll = function (e) {
            mouseMenuDiv.removeAttribute('style');
        };
        // 缩进按钮点击事件
        splitterBtn.onclick = function (e) {
            var splitterDiv = e.currentTarget.parentElement;
            var splitterIcon = e.currentTarget.children[0];
            var fold = e.currentTarget.getAttribute('fold');
            var pageBar = document.getElementById('pageBar');
            if (fold == 'false') {
                stencilDiv.setAttribute('style', 'display:none;');
                splitterDiv.setAttribute('style', 'left:0;');
                container.setAttribute('style', 'left:17px;');
                splitterIcon.innerHTML = '&#xe743;';
                e.currentTarget.setAttribute('fold', 'true');
                pageBar.setAttribute('style', 'left:25px;');
            }
            else {
                stencilDiv.setAttribute('style', 'width:' + stencilDivWidth + 'px;');
                splitterDiv.setAttribute('style', 'left:' + stencilDivWidth + 'px;');
                container.setAttribute('style', 'left:' + (Number(stencilDivWidth) + 17) + 'px;');
                pageBar.setAttribute('style', 'left:' + (Number(stencilDivWidth) + 25) + 'px;');
                splitterIcon.innerHTML = '&#xe738;';
                e.currentTarget.setAttribute('fold', 'false');
            }
            svgOffsetX = container.offsetLeft;
            svgOffsetY = container.offsetTop;
        };
        // 拦截鼠标右键菜单
        document.oncontextmenu = function (e) {
            if (exports.activedPageSvg.SelectedElement) {
                // 取消全选
                exports.activedPageSvg.ClearSelectRect();
                exports.activedPageSvg.SelectService.ClearCollection();
                exports.activedPageSvg.CreateSelectRect(exports.activedPageSvg.SelectedElement);
                exports.activedPageSvg.SelectService.SetSelected(exports.activedPageSvg.SelectedElement);
                mouseMenuDiv.style.display = 'block';
                var menuLeft = e.clientX, menuTop = e.clientY;
                if (menuLeft + mouseMenuDiv.clientWidth > window.innerWidth) {
                    menuLeft -= mouseMenuDiv.clientWidth;
                }
                if (menuTop + mouseMenuDiv.clientHeight > window.innerHeight) {
                    menuTop -= mouseMenuDiv.clientHeight;
                }
                mouseMenuDiv.style.left = menuLeft + 'px';
                mouseMenuDiv.style.top = menuTop + 'px';
                // 控制菜单显示
                if (exports.activedPageSvg.SelectedElement == exports.activedPageSvg.Activedshape) {
                    var businessType = exports.activedPageSvg.Activedshape.BusinessType;
                    var isCloned = exports.activedPageSvg.Activedshape.ClonedId ? true : false;
                    var shapeDefine_1 = SvgUtility_1.default.findItemInArray('type', businessType, stencils);
                    var menuConfig = shapeDefine_1['mouseMenu'];
                    setMenuDisplay(menuConfig, isCloned);
                }
                else if (exports.activedPageSvg.SelectedElement == exports.activedPageSvg.ActivedLine) {
                    setMenuDisplay('delete');
                }
            }
            return false;
        };
        // 菜单点击事件
        mouseMenuDiv.onclick = function (e) {
            if (e.target.nodeName == 'LI') {
                var operate = e.target.getAttribute('operate');
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
        };
        // 缩放svg页面
        function scaleSvg(isZoom, scaleUnit) {
            if (currScale >= 3 && isZoom || currScale <= 0.1 && !isZoom) {
                return;
            }
            if (isZoom) {
                currScale += scaleUnit;
            }
            else {
                currScale -= scaleUnit;
            }
            currScale = Number(currScale.toFixed(2));
            SvgElementModel_1.SvgElementModel.canvasScale = currScale;
            // set svg group scale and svg width & height
            var real_clientX = clientX - svgOffsetX;
            var real_clientY = clientY - svgOffsetY;
            var scroll_x = mouseleft * currScale / (currScale - scaleUnit) - real_clientX;
            var scroll_y = mousetop * currScale / (currScale - scaleUnit) - real_clientY;
            if (!isZoom) {
                scroll_x = mouseleft / currScale / (currScale - scaleUnit) - real_clientX;
                scroll_y = mousetop / currScale / (currScale - scaleUnit) - real_clientY;
            }
            for (var i = 0; i < pageCount; i++) {
                var canvas = canvasCollection[i]['canvas'];
                canvas.ScaleCanvas(currScale);
            }
            scroller.scrollTop = scroll_x;
            scroller.scrollLeft = scroll_y;
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
            if (exports.activedPageSvg.SelectedElement) {
                beforeDeleteEvent(SvgCanvas_1.SvgCanvas.CurrentCanvas);
            }
        }
        // 右键菜单生成副本事件
        function createNodeCopy() {
            if (exports.activedPageSvg.SelectedElement &&
                exports.activedPageSvg.Activedshape == exports.activedPageSvg.SelectedElement) {
                beforeElementCloneEvent(exports.activedPageSvg, exports.activedPageSvg.Activedshape);
            }
        }
        // 设置右键menu项的显示与隐藏
        function setMenuDisplay(config, isCloned) {
            if (!config) {
                return;
            }
            var operates = config.split(',');
            menuDelete.removeAttribute('style');
            menuClone.removeAttribute('style');
            for (var i in operates) {
                var operate = operates[i];
                if (operate == 'delete') {
                    menuDelete.style.display = 'block';
                }
                else if (operate == 'copy' && !isCloned) {
                    menuClone.style.display = 'block';
                }
            }
        }
        // 根据选择框的范围，选中页面元素
        function selectElementsBySelection() {
            var x = selectionDiv.offsetLeft;
            var y = selectionDiv.offsetTop;
            var w = selectionDiv.clientWidth;
            var h = selectionDiv.clientHeight;
            exports.activedPageSvg.SelectElementsByRegion(x, y, x + w, y + h);
            isSelecting = false;
            selectionDiv.removeAttribute('style');
            svgPaper.removeAttribute('style');
        }
    }
    // 导出页面数据
    function exportPageData() {
        var exportData = {};
        if (canvasCollection.length == 0) {
            return;
        }
        var pageDatas = [];
        var pageCount = canvasCollection.length;
        for (var i = 0; i < pageCount; i++) {
            var canvasItem = canvasCollection[i]['canvas'];
            var pageNo = canvasCollection[i]['pageNo'];
            var pageItem = getCanvasData(canvasItem);
            pageItem['pageNo'] = i + 1; //重新赋值pageNo
            pageDatas.push(pageItem);
        }
        exportData['pageType'] = '';
        exportData['pages'] = pageDatas;
        return JSON.stringify(exportData);
    }
    // 获取单个page的数据
    function getCanvasData(canvas) {
        var exportData = {};
        if (!canvas) {
            return;
        }
        var allElements = canvas.GetSvgElementsInCanvas();
        var shapes = [];
        var lines = [];
        for (var i = 0; i < allElements.length; i++) {
            if (allElements[i].ElementType == 'shape') {
                var shape = allElements[i];
                var shapeSvg = shape.SvgElement.childNodes[0];
                var shapeItem = {};
                shapeItem['id'] = shape.Id;
                shapeItem['type'] = shape.BusinessType;
                shapeItem['translate'] = shape.Translate;
                var replaceStr = '"';
                shapeItem['text'] = shape.Text.replace(new RegExp(replaceStr, 'gm'), "'");
                shapeItem['businessData'] = shape.BusinessData;
                shapes.push(shapeItem);
            }
            else {
                var line = allElements[i];
                var lineItem = {};
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
    function importPageData(data) {
        if (!data) {
            return;
        }
        resetCanvas();
        resetPageBar();
        if (typeof (data) == 'string') {
            data = JSON.parse(data);
        }
        var deleteIcon = document.getElementById('deleteIcon');
        for (var i = 0, len = data.pages.length; i < len; i++) {
            var pageData = data.pages[i];
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
    function importTemplateData(data) {
        if (typeof (data) == 'string') {
            data = JSON.parse(data);
        }
        var pageData = data.pages[0];
        importCanvasByData(pageData, true);
        importedTemplateEvent();
    }
    // 导入单个页面数据
    function importCanvasByData(data, isTemplate) {
        var canvas = data['canvas'];
        var shapes = data['shapes'];
        var lines = data['lines'];
        var svgCanvas = exports.activedPageSvg;
        if (!isTemplate) {
            var id = canvas['id'];
            svgCanvas.Id = id;
        }
        else {
            svgCanvas.SelectService.ClearCollection();
            svgCanvas.ClearSelectRect();
        }
        for (var i = 0; i < shapes.length; i++) {
            var shape = shapes[i];
            var gElement = SvgUtility_1.default.CreateSvgElement('g', [{ 'attr': 'class', 'val': 'content' }]);
            var shapeInfo = matchShapeInfo(shape['type']);
            if (!shapeInfo) {
                continue;
            }
            var elements = shapeInfo['elements'];
            for (var j = 0, count = elements.length; j < count; j++) {
                var item = elements[j];
                SvgUtility_1.default.CreateSvgElement(item['svgType'], item['attrs'], gElement);
            }
            var textNode = SvgUtility_1.default.CreateSvgElement('text', shapeInfo['text']['attrs'], gElement);
            var shapeItem = new SvgElement_2.SvgElementShapeItem(gElement, svgCanvas, shape['id']);
            var shapeLinks = matchLinks(shapeInfo['links'], baseLines);
            shapeItem.Links = shapeLinks;
            shapeItem.SetTanslate(shape['translate'][0], shape['translate'][1]);
            shapeItem.SetText(shape['text']);
            shapeItem.BusinessType = shape['type'];
            shapeItem.BusinessData = shape['businessData'];
            if (isTemplate) {
                svgCanvas.SelectService.AddSelected(shapeItem);
                svgCanvas.CreateSelectRect(shapeItem);
                svgCanvas.PaperFitToContent(shapeItem);
            }
        }
        for (var i = 0; i < lines.length; i++) {
            var line = lines[i];
            var sourceId = line['sourceId'];
            var targetId = line['targetId'];
            var opreatePoints = line['opreatePoints'];
            var sourceShape = svgCanvas.GetSvgElementById(sourceId);
            var lineItem = new SvgElement_3.SvgElementLineItem(svgCanvas, sourceShape, line['id']);
            if (targetId) {
                var targetShape = svgCanvas.GetSvgElementById(targetId);
                lineItem.Target = targetShape;
            }
            var linkInfo = SvgUtility_1.default.findItemInArray('businessType', line['type'], baseLines);
            linkInfo['defaultText'] = line['text'];
            lineItem.InitByData(linkInfo);
            lineItem.UpdateOperatePoints(opreatePoints[0], opreatePoints[1]);
            lineItem.SetOperateOffset();
            lineItem.UpdateLinePath(true);
            lineItem.BusinessData = line['businessData'];
        }
        svgCanvas.ResetHandlerPanel();
    }
    // 通过业务类型得到model定义中的shape信息
    function matchShapeInfo(type) {
        var modelInfo;
        var models = initParams['models'];
        for (var i = 0, len = models.length; i < len; i++) {
            if (models[i]['type'] == type) {
                modelInfo = models[i];
                break;
            }
        }
        var shapeInfo = modelInfo ? shapeDefine[modelInfo['model']] : null;
        if (shapeInfo) {
            shapeInfo['links'] = modelInfo['links'];
        }
        return shapeInfo;
    }
    // 匹配连线数据
    function matchLinks(links, linkInfos) {
        var matchedInfos = [];
        for (var m = 0; m < links.length; m++) {
            for (var n = 0; n < linkInfos.length; n++) {
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
        var params = initParams;
        var canvasElement = el;
        var width = params.width;
        var height = params.height;
        var svgCanvas = new SvgCanvas_1.SvgCanvas(canvasElement, width, height);
        svgCanvas.LineModels = params.lineModels;
        baseLines = params.lineModels;
        var models = params.models;
        if (models) {
            for (var i = 0; i < models.length; i++) {
                var element = document.getElementById(models[i]['id']);
                var links = models[i]['links'];
                var elementLinks = matchLinks(links, baseLines);
                var model = new SvgElementModel_1.SvgElementModel(element, elementLinks);
                model.BusinessType = models[i]['type'];
                model.DefaultText = models[i]['defaultText'];
                model.ShowText = models[i]['showText'];
            }
        }
        canvasCollection.push({ 'pageNo': pageidx, 'canvas': svgCanvas });
        svgCanvas.Show();
        exports.activedPageSvg = svgCanvas;
        registerEventHandler(svgCanvas);
    }
    // 初始化分页条
    function initPageBar() {
        var pageDom = document.getElementById('pageBar');
        var deleteIcon = document.createElement('i');
        deleteIcon.setAttribute('id', 'deleteIcon');
        deleteIcon.setAttribute('class', 'vicons');
        deleteIcon.setAttribute('style', 'cursor:pointer;display:none;');
        deleteIcon.setAttribute('title', '删除当前活动页');
        deleteIcon.innerHTML = '&#xe6dd;';
        var addIcon = document.createElement('i');
        addIcon.setAttribute('id', 'addIcon');
        addIcon.setAttribute('class', 'vicons');
        addIcon.setAttribute('style', 'display:inline-block;cursor:pointer;');
        addIcon.setAttribute('title', '增加一页');
        addIcon.innerHTML = '&#xe6dc;';
        var pageUl = document.createElement('ul');
        pageUl.setAttribute('id', 'pageUl');
        pageUl.setAttribute('style', 'list-style: none;display:inline; padding:0;');
        pageDom.appendChild(deleteIcon);
        pageDom.appendChild(pageUl);
        pageDom.appendChild(addIcon);
        var deleteFn = function (canvasId) {
            if (pageCount == 1) {
                return;
            }
            pageCount--;
            if (pageCount == 1) {
                deleteIcon.setAttribute('style', 'cursor:pointer;display:none;');
            }
            var delPageDom = activedPageDom;
            var delPageSvg = exports.activedPageSvg;
            if (canvasId) {
                delPageSvg = getCanvasById(canvasId);
                delPageDom = getPageDomById(exports.activedPageSvg.Id);
            }
            if (delPageSvg && delPageDom) {
                pageUl.removeChild(delPageDom);
                removeCanvasPage(delPageSvg);
                changePage(pageUl.firstChild);
            }
        };
        deletePageFn = deleteFn;
        deleteIcon.addEventListener('click', function (e) {
            if (runInWpf) {
                beforePageDeleteEvent();
            }
            else {
                deleteFn();
            }
        });
        addIcon.addEventListener('click', function (e) {
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
        var pageUl = document.getElementById('pageUl');
        if (activedPageDom) {
            activedPageDom.setAttribute('class', 'page-num');
        }
        var numNode = document.createElement('li');
        numNode.setAttribute('class', 'page-num-selected');
        numNode.setAttribute('style', 'cursor:pointer');
        numNode.setAttribute('name', 'pageNo');
        numNode.setAttribute('page', pageidx.toString());
        numNode.innerHTML = pageidx.toString();
        pageUl.appendChild(numNode);
        activedPageDom = numNode;
        numNode.addEventListener('click', function (e) {
            changePage(this);
        });
        return numNode;
    }
    // 创建一个新的svg页面
    function createNewSvgPage(svgNode) {
        if (exports.activedPageSvg) {
            exports.activedPageSvg.Hide();
        }
        var svgPaper = document.getElementById('svgPaper');
        // activedPageSvg
        if (!svgNode) {
            svgNode = SvgUtility_1.default.CreateSvgElement('svg', { 'class': 'svgCanvas' }, svgPaper);
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
        var activedIdx = activedPageDom.getAttribute('page');
        var pageCount = canvasCollection.length;
        for (var i = 0; i < pageCount; i++) {
            var canvasItem = canvasCollection[i]['canvas'];
            if (canvasCollection[i]['pageNo'] == activedIdx) {
                canvasItem.Show();
                exports.activedPageSvg = canvasItem;
            }
            else {
                canvasItem.Hide();
            }
        }
        changedPageEvent();
    }
    // 删除svg页面
    function removeCanvasPage(pageSvg) {
        var pageCount = canvasCollection.length;
        for (var i = 0; i < pageCount; i++) {
            var canvasItem = canvasCollection[i]['canvas'];
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
        var len = canvasCollection.length;
        if (len == 1) {
            return canvasCollection[0]['canvas'];
        }
        for (var i = 0; i < len; i++) {
            if (canvasCollection[i].canvas.Id == id) {
                return canvasCollection[i]['canvas'];
            }
        }
    }
    // 获取画布编号
    function getPageNoById(canvasId) {
        var len = canvasCollection.length;
        if (len == 1) {
            return canvasCollection[0]['canvas'];
        }
        for (var i = 0; i < len; i++) {
            if (canvasCollection[i].canvas.Id == canvasId) {
                return canvasCollection[i]['pageNo'];
            }
        }
    }
    // 获取page 分页 dom
    function getPageDomById(canvasId) {
        var pageNo = getPageNoById(canvasId);
        var pageUl = document.getElementById('pageUl');
        var liDoms = pageUl.childNodes;
        for (var i in liDoms) {
            var item = liDoms[i];
            var no = item.getAttribute('page');
            if (no == pageNo) {
                return item;
            }
        }
    }
    // 重置svg画布为初始化状态
    function resetCanvas() {
        var pageCount = canvasCollection.length;
        for (var i = 0; i < pageCount; i++) {
            var canvasItem = canvasCollection[i]['canvas'];
            canvasItem.Distory();
        }
        canvasCollection = [];
        createNewSvgPage();
    }
    // 重置分页控件为初始化状态
    function resetPageBar() {
        var pageDom = document.getElementById('pageBar');
        var nodes = pageDom.childNodes;
        while (nodes.length > 0) {
            pageDom.removeChild(nodes[0]);
        }
        pageCount = 1;
        pageidx = 1;
        initPageBar();
    }
    // WPF-->JS
    // handle wpf message start
    function handleWpfMessage(message) {
        try {
            if (typeof (message) == 'string') {
                message = eval("(" + message + ")");
            }
            var result = '1';
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
                    createShapeElement(message['MessageContent']);
                    break;
                case 'createLineElement':
                    createLineElement(message['MessageContent']);
                default:
                    break;
            }
            return result;
        }
        catch (err) {
            alert('wpf message error: ' + err);
        }
    }
    exports.handleWpfMessage = handleWpfMessage;
    // 获取导出Img数据
    function exportImgData() {
        var svgDefs = document.getElementById('svgDefs').cloneNode(true);
        SvgUtility_1.default.GetSvgAsImg(exports.activedPageSvg, baseLines, svgDefs, function (data) {
            var messageType = 'exportImgData';
            var content = {
                dataType: 'base64',
                dataContent: data.substring(data.indexOf(',') + 1)
            };
            console.log(data);
            exports.submitWPF(messageType, content);
        });
    }
    exports.exportImgData = exportImgData;
    // 更新元素数据
    function updateNodeData(data) {
        var canvasId = data['canvasId'];
        var nodeId = data['nodeId'];
        var dataNo = data['dataNo'];
        var businessData = data['data'];
        var canvas = getCanvasById(canvasId);
        canvas.UpdateElementData(nodeId, dataNo, businessData);
    }
    // 更新元素text
    function updateNodeText(data) {
        var canvasId = data['canvasId'];
        var nodeId = data['nodeId'];
        var text = data['nodeText'];
        var canvas = getCanvasById(canvasId);
        canvas.UpdateElementText(nodeId, text);
    }
    // 更新图形颜色
    function updateShapeColor(data) {
        var canvasId = data['canvasId'];
        var nodeId = data['nodeId'];
        var color = data['color'];
        var canvas = getCanvasById(canvasId);
        var shapeItem = canvas.GetSvgElementById(nodeId);
        if (!shapeItem) {
            return;
        }
        shapeItem.SetColor(color);
    }
    // 获取与指定shape相关连的线
    function getLinesByShape(data) {
        var canvasId = data['canvasId'];
        var nodeId = data['nodeId'];
        var canvas = getCanvasById(canvasId);
        var shapeItem = canvas.GetSvgElementById(nodeId);
        if (!shapeItem) {
            return '';
        }
        var lines = shapeItem.GetElementLines();
        // lines.sourceLines,lines.targetLines;
        var result;
        var outLines = [];
        var inLines = [];
        for (var i = 0, len = lines.sourceLines.length; i < len; i++) {
            var line = lines.sourceLines[i];
            var lineItem = {
                nodeId: line.Id,
                nodeText: line.Text,
                nodeType: 'line',
                businessType: line.BusinessType,
                businessData: line.BusinessData
            };
            outLines.push(lineItem);
        }
        for (var i = 0, len = lines.targetLines.length; i < len; i++) {
            var line = lines.targetLines[i];
            var lineItem = {
                nodeId: line.Id,
                nodeText: line.Text,
                nodeType: 'line',
                businessType: line.BusinessType,
                businessData: line.BusinessData
            };
            inLines.push(lineItem);
        }
        result = {
            outLines: outLines,
            inLines: inLines
        };
        return JSON.stringify(result);
    }
    // 获取与指定line相关连的图形
    function getShapesByLine(data) {
        var canvasId = data['canvasId'];
        var nodeId = data['nodeId'];
        var canvas = getCanvasById(canvasId);
        var lineItem = canvas.GetSvgElementById(nodeId);
        if (!lineItem) {
            return '';
        }
        lineItem.Source, lineItem.Target;
        var result = {
            sourceShape: {
                nodeId: lineItem.Source.Id,
                clonedId: lineItem.Source.ClonedId || '',
                nodeText: lineItem.Source.Text,
                nodeType: 'shape',
                businessType: lineItem.Source.BusinessType,
                businessData: lineItem.Source.BusinessData
            },
            targetShape: lineItem.Target == undefined || null ? '' : {
                nodeId: lineItem.Target.Id,
                clonedId: lineItem.Target.ClonedId || '',
                nodeText: lineItem.Target.Text,
                nodeType: 'shape',
                businessType: lineItem.Target.BusinessType,
                businessData: lineItem.Target.BusinessData
            }
        };
        return JSON.stringify(result);
    }
    // 获取指定canvas中所有的元素
    function getAllElement(data) {
        var canvasId = data['canvasId'];
        var canvas = getCanvasById(canvasId);
        var elementCollection = canvas.GetSvgElementsInCanvas();
        var elements = [];
        for (var i = 0, len = elementCollection.length; i < len; i++) {
            var item = elementCollection[i];
            var elementItem = {
                nodeId: item.Id,
                clonedId: item.ClonedId || '',
                nodeText: item.Text,
                nodeType: item.ElementType,
                businessType: item.BusinessType,
                businessData: item.BusinessData
            };
            elements.push(elementItem);
        }
        var result = {
            elements: elements
        };
        return JSON.stringify(result);
    }
    // 改变指定的元素
    function changeElement(data) {
        var canvasId = data['canvasId'];
        var elementId = data['nodeId'];
        var targetType = data['targetType'];
        if (!canvasId || !elementId || !targetType) {
            return;
        }
        var canvas = getCanvasById(canvasId);
        var selectedElement = canvas.GetSvgElementById(elementId);
        if (!selectedElement) {
            return;
        }
        var nodeType = selectedElement.ElementType;
        if (nodeType == 'shape') {
            var transform = selectedElement.SvgElement.getAttribute('transform');
            canvas.groupElement.removeChild(selectedElement.SvgElement);
            var targetInfo = SvgUtility_1.default.findItemInArray('type', targetType, stencils);
            var shapeInfo = shapeDefine[targetInfo['model']];
            var shapes = shapeInfo['elements'];
            var gAttrs = [{ attr: 'class', val: 'Content' }, { attr: 'transform', val: transform }];
            var globalNode = SvgUtility_1.default.CreateSvgElement('g', gAttrs, canvas.groupElement);
            for (var j = 0, count = shapes.length; j < count; j++) {
                var item = shapes[j];
                SvgUtility_1.default.CreateSvgElement(item['svgType'], item['attrs'], globalNode);
            }
            var textNode = SvgUtility_1.default.CreateSvgElement('text', shapeInfo['text']['attrs'], globalNode);
            if (targetInfo['showText']) {
                textNode.innerHTML = targetInfo['defaultText'] || '';
            }
            else {
                textNode.setAttribute('display', 'none');
            }
            selectedElement.SvgElement = globalNode;
            selectedElement.BusinessType = targetType;
            selectedElement.RegisterEvent();
        }
        else {
            var targetInfo = SvgUtility_1.default.findItemInArray('businessType', targetType, baseLines);
            selectedElement.SvgElement.children[0].setAttribute('class', targetInfo['class']);
            selectedElement.BusinessType = targetType;
        }
    }
    // 删除元素
    function deleteNodeById(data) {
        var canvasId = data['canvasId'];
        var nodeIds = data['nodeIds'];
        var canvas = getCanvasById(canvasId);
        var ids = nodeIds.split(',');
        canvas.RemoveElementsByIds(ids);
    }
    // 连接图形元素
    function connectElements(data) {
        var canvasId = data['canvasId'];
        var targetNodeId = data['targetNodeId'];
        var lineId = data['lineId'];
        var canvas = getCanvasById(canvasId);
        canvas.ConnectElements(targetNodeId, lineId);
    }
    // 生成图形副本
    function cloneElement(data) {
        var canvasId = data['canvasId'];
        var nodeId = data['nodeId'];
        var canvas = getCanvasById(canvasId);
        var shape = canvas.GetSvgElementById(nodeId);
        if (shape) {
            canvas.CloneShapeElement(shape);
        }
    }
    // 断开线的target连接
    function breakTargetConnection(data) {
        var canvasId = data['canvasId'];
        var lineId = data['lineId'];
        var canvas = getCanvasById(canvasId);
        var line = canvas.GetSvgElementById(lineId);
        if (line) {
            line.RemoveTarget();
            breakedConnectionEvent(canvas, line);
        }
    }
    // 删除当前page页
    function deleteCurrPage(data) {
        var canvasId = data['canvasId'];
        deletePageFn(canvasId);
    }
    // 处理WPF msg
    function handleWpfMsg(data) {
        var msg = data['msg'];
        alert(msg);
    }
    // 选中单个元素
    function selectElement(data) {
        var canvasId = data['canvasId'];
        var nodeId = data['nodeId'];
        var canvas = getCanvasById(canvasId);
        var element = canvas.GetSvgElementById(nodeId);
        // 触发选中后事件
        // 设置画布上的选中
        canvas.SelectedElement = element;
        if (element.ElementType == 'shape') {
            canvas.Activedshape = element;
            element.IsSelected = true;
            canvas.SelectService.SetSelected(element);
            canvas.ClearSelectRect();
            canvas.CreateSelectRect(element);
        }
        else {
            canvas.SelectService.ClearCollection();
            canvas.ClearSelectRect();
            canvas.ActivedLine = element;
        }
        elementSelected = true;
        canvas.ResetHandlerPanel(element);
    }
    // 生成图形元素
    function createShapeElement(data) {
        var canvasId = data['canvasId'];
        var businessType = data['businessType'];
        var businessData = data['businessData'];
        var positionX = data['positionX'];
        var positionY = data['positionY'];
        var canvas = getCanvasById(canvasId);
        var gElement = SvgUtility_1.default.CreateSvgElement('g', [{ 'attr': 'class', 'val': 'content' }]);
        var shapeInfo = matchShapeInfo(businessType);
        if (!shapeInfo) {
            return;
        }
        // create svg elements in defined
        var elements = shapeInfo['elements'];
        for (var j = 0, count = elements.length; j < count; j++) {
            var item = elements[j];
            SvgUtility_1.default.CreateSvgElement(item['svgType'], item['attrs'], gElement);
        }
        var textNode = SvgUtility_1.default.CreateSvgElement('text', shapeInfo['text']['attrs'], gElement);
        var shapeItem = new SvgElement_2.SvgElementShapeItem(gElement, canvas);
        var shapeLinks = matchLinks(shapeInfo['links'], baseLines);
        shapeItem.Links = shapeLinks;
        shapeItem.SetTanslate(positionX, positionY);
        shapeItem.BusinessType = businessType;
        shapeItem.BusinessData = businessData;
        canvas.PaperFitToContent(shapeItem);
        return shapeItem.Id;
    }
    exports.createShapeElement = createShapeElement;
    // 生成线并连接图形元素
    function createLineElement(data) {
        var canvasId = data['canvasId'];
        var businessType = data['businessType'];
        var businessData = data['businessData'];
        var sourceId = data['sourceId'];
        var targetId = data['targetId'];
        var canvas = getCanvasById(canvasId);
        var lineId = SvgUtility_1.default.uuid();
        var sourceShape = canvas.GetSvgElementById(sourceId);
        var targetShape = canvas.GetSvgElementById(targetId);
        var lineItem = new SvgElement_3.SvgElementLineItem(canvas, sourceShape, lineId);
        lineItem.Target = targetShape;
        var linkInfo = SvgUtility_1.default.findItemInArray('businessType', businessType, baseLines);
        lineItem.InitByData(linkInfo);
        lineItem.CreateStraightLine();
        lineItem.BusinessData = businessData;
    }
    exports.createLineElement = createLineElement;
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
        var messageType = "beforeConnect";
        if (!runInWpf) {
            canvas.ConnectElements(targetShape.Id, line.Id);
            return;
        }
        var sourceShape = line.Source;
        var messageContent = {
            canvasId: canvas.Id,
            sourceClonedId: sourceShape.ClonedId,
            sourceNodeId: sourceShape.Id,
            sourceNodeText: sourceShape.Text,
            sourceNodeType: sourceShape.ElementType,
            sourceBusinessType: sourceShape.BusinessType,
            sourceBusinessData: sourceShape.BusinessData,
            targetClonedId: targetShape.ClonedId,
            targetNodeId: targetShape.Id,
            targetNodeText: targetShape.Text,
            targetNodeType: targetShape.ElementType,
            targetBusinessType: targetShape.BusinessType,
            targetBusinessData: targetShape.BusinessData,
            lineId: line.Id,
            lineText: line.Text,
            lineNodeType: line.ElementType,
            lineBusinessType: line.BusinessType,
            lineBusinessData: line.BusinessData
        };
        exports.submitWPF(messageType, messageContent);
    }
    // 删除前事件
    function beforeDeleteEvent(canvas) {
        var selectedElement = canvas.SelectedElement;
        var selectedElements = canvas.SelectService.GetSelectableCollection();
        var deleteElements = [];
        var selectedCount = selectedElements.length;
        if (!selectedElement && selectedCount == 0) {
            return;
        }
        else if (selectedCount > 0) {
            for (var i = 0; i < selectedCount; i++) {
                var shapeItem = selectedElements[i];
                var lines = shapeItem.GetElementLines();
                deleteElements.push(shapeItem);
                deleteElements = deleteElements.concat(lines['sourceLines']);
            }
        }
        else {
            var lineItem = selectedElement;
            deleteElements.push(lineItem);
        }
        if (!runInWpf) {
            if (selectedCount > 0) {
                canvas.RemoveElements(selectedElements);
            }
            else {
                canvas.RemoveElements([selectedElement]);
            }
            return;
        }
        var elementArray = [];
        for (var i = 0, len = deleteElements.length; i < len; i++) {
            var element = deleteElements[i];
            var item = {
                canvasId: canvas.Id,
                clonedId: element.ClonedId,
                nodeId: element.Id,
                nodeType: element.ElementType,
                nodeText: element.Text,
                businessType: element.BusinessType,
                businessData: element.BusinessData
            };
            elementArray.push(item);
        }
        var messageType = "beforeDelete";
        var messageContent = {
            elements: elementArray
        };
        exports.submitWPF(messageType, messageContent);
    }
    // 连接后事件
    function elementConnectedEvent(canvas, line, targetShape) {
        if (!runInWpf) {
            return;
        }
        var messageType = "elementConnected";
        var sourceShape = line.Source;
        var messageContent = {
            canvasId: canvas.Id,
            sourceClonedId: sourceShape.ClonedId,
            sourceNodeId: sourceShape.Id,
            sourceNodeText: sourceShape.Text,
            sourceNodeType: sourceShape.ElementType,
            sourceBusinessType: sourceShape.BusinessType,
            sourceBusinessData: sourceShape.BusinessData,
            targetClonedId: targetShape.ClonedId,
            targetNodeId: targetShape.Id,
            targetNodeText: targetShape.Text,
            targetNodeType: targetShape.ElementType,
            targetBusinessType: targetShape.BusinessType,
            targetBusinessData: targetShape.BusinessData,
            lineId: line.Id,
            lineText: line.Text,
            lineNodeType: line.ElementType,
            lineBusinessType: line.BusinessType,
            lineBusinessData: line.BusinessData
        };
        exports.submitWPF(messageType, messageContent);
    }
    // 增加后事件
    function elementAddedEvent(canvas, element) {
        if (!runInWpf) {
            elementSelected = true;
            // 设置画布上的选中
            canvas.SelectedElement = element;
            if (element.ElementType == 'shape') {
                canvas.Activedshape = element;
                element.IsSelected = true;
                canvas.SelectService.SetSelected(element);
                canvas.ClearSelectRect();
                canvas.CreateSelectRect(element);
            }
            else {
                canvas.SelectService.ClearCollection();
                canvas.ClearSelectRect();
                canvas.ActivedLine = element;
            }
            canvas.ResetHandlerPanel(element);
            return;
        }
        var messageType = "elementAdded";
        var messageContent = {
            canvasId: canvas.Id,
            clonedId: element.ClonedId,
            nodeId: element.Id,
            nodeType: element.ElementType,
            nodeText: element.Text,
            businessType: element.BusinessType,
            businessData: element.BusinessData
        };
        exports.submitWPF(messageType, messageContent);
    }
    // 选中后事件
    function elementSelectedEvent(canvas, element) {
        elementSelected = true;
        if (!runInWpf) {
            return;
        }
        var messageType = "selected";
        var messageContent = {
            canvasId: canvas.Id,
            clonedId: element.ClonedId,
            nodeId: element.Id,
            nodeType: element.ElementType,
            nodeText: element.Text,
            businessType: element.BusinessType,
            businessData: element.BusinessData
        };
        exports.submitWPF(messageType, messageContent);
    }
    // 删除后事件
    function elementDeletedEvent(canvas) {
        if (!runInWpf) {
            canvas.SelectedElement = null;
            canvas.SelectService.ClearCollection();
            return;
        }
        var selectedElement = canvas.SelectedElement;
        var selectedElements = canvas.SelectService.GetSelectableCollection();
        var deleteElements = [];
        var selectedCount = selectedElements.length;
        if (selectedCount > 0) {
            for (var i = 0; i < selectedCount; i++) {
                var shapeItem = selectedElements[i];
                var lines = shapeItem.GetElementLines();
                deleteElements.push(shapeItem);
                deleteElements = deleteElements.concat(lines['sourceLines']);
            }
        }
        else {
            var lineItem = selectedElement;
            deleteElements.push(lineItem);
        }
        var elementArray = [];
        for (var i = 0, len = deleteElements.length; i < len; i++) {
            var element = deleteElements[i];
            var item = {
                canvasId: canvas.Id,
                clonedId: element.ClonedId,
                nodeId: element.Id,
                nodeType: element.ElementType,
                nodeText: element.Text,
                businessType: element.BusinessType,
                businessData: element.BusinessData
            };
            elementArray.push(item);
        }
        canvas.SelectedElement = null;
        canvas.SelectService.ClearCollection();
        var messageType = "deleted";
        var messageContent = {
            elements: elementArray
        };
        exports.submitWPF(messageType, messageContent);
    }
    // 取消选中事件
    function cancelSelectEvent() {
        elementSelected = false;
        if (!runInWpf) {
            return;
        }
        var messageType = "cancelSelect";
        var messageContent = "OK";
        exports.submitWPF(messageType, messageContent);
    }
    // 发送导入数据结果事件
    function importedDataEvent() {
        var messageType = "importDataResult";
        var messageContent = "OK";
        exports.submitWPF(messageType, messageContent);
    }
    // 发送导入模板结果事件
    function importedTemplateEvent() {
        var messageType = "importTemplateResult";
        var messageContent = "OK";
        exports.submitWPF(messageType, messageContent);
    }
    // 生成副本前事件
    function beforeElementCloneEvent(canvas, shape) {
        var messageType = "beforClone";
        if (!runInWpf) {
            canvas.CloneShapeElement(shape);
            return;
        }
        var messageContent = {
            canvasId: canvas.Id,
            clonedId: shape.ClonedId,
            nodeId: shape.Id,
            nodeText: shape.Text,
            nodeType: shape.ElementType,
            businessType: shape.BusinessType,
            businessData: shape.BusinessData
        };
        exports.submitWPF(messageType, messageContent);
    }
    // 生成副本后事件
    function elementClonedEvent(canvas, clonedShape) {
        if (!runInWpf) {
            return;
        }
        var messageType = "cloned";
        var messageContent = {
            canvasId: canvas.Id,
            clonedId: clonedShape.ClonedId,
            nodeId: clonedShape.Id,
            nodeType: clonedShape.ElementType,
            nodeText: clonedShape.Text,
            businessType: clonedShape.BusinessType,
            businessData: clonedShape.BusinessData
        };
        exports.submitWPF(messageType, messageContent);
    }
    // 断开连接前事件
    function beforeBreakConnectionEvent(canvas, line, targetShape) {
        var messageType = "beforeBreakConnection";
        if (!runInWpf) {
            line.RemoveTarget();
            return;
        }
        var sourceShape = line.Source;
        var messageContent = {
            canvasId: canvas.Id,
            sourceClonedId: sourceShape.ClonedId,
            sourceNodeId: sourceShape.Id,
            sourceNodeText: sourceShape.Text,
            sourceNodeType: sourceShape.ElementType,
            sourceBusinessType: sourceShape.BusinessType,
            sourceBusinessData: sourceShape.BusinessData,
            targetClonedId: targetShape.ClonedId,
            targetNodeId: targetShape.Id,
            targetNodeText: targetShape.Text,
            targetNodeType: targetShape.ElementType,
            targetBusinessType: targetShape.BusinessType,
            targetBusinessData: targetShape.BusinessData,
            lineId: line.Id,
            lineText: line.Text,
            lineNodeType: line.ElementType,
            lineBusinessType: line.BusinessType,
            lineBusinessData: line.BusinessData
        };
        exports.submitWPF(messageType, messageContent);
    }
    // 断开连接后事件
    function breakedConnectionEvent(canvas, line) {
        var messageType = "breakedConnection";
        if (!runInWpf) {
            return;
        }
        var sourceShape = line.Source;
        var messageContent = {
            canvasId: canvas.Id,
            sourceClonedId: sourceShape.ClonedId,
            sourceNodeId: sourceShape.Id,
            sourceNodeText: sourceShape.Text,
            sourceNodeType: sourceShape.ElementType,
            sourceBusinessType: sourceShape.BusinessType,
            sourceBusinessData: sourceShape.BusinessData,
            lineId: line.Id,
            lineText: line.Text,
            lineNodeType: line.ElementType,
            lineBusinessType: line.BusinessType,
            lineBusinessData: line.BusinessData
        };
        exports.submitWPF(messageType, messageContent);
    }
    // 页面加载后事件
    function onloadEvent() {
        if (!runInWpf || !exports.submitWPF) {
            return;
        }
        var messageType = "webOnload";
        var messageContent = {
            canvasId: exports.activedPageSvg.Id
        };
        exports.submitWPF(messageType, messageContent);
    }
    exports.onloadEvent = onloadEvent;
    // 增加页签前后事件
    function canvasPageAddedEvent() {
        if (!runInWpf || !exports.submitWPF) {
            return;
        }
        var messageType = "pageAdded";
        var messageContent = {
            canvasId: exports.activedPageSvg.Id
        };
        exports.submitWPF(messageType, messageContent);
    }
    // 删除页签前事件
    function beforePageDeleteEvent() {
        var messageType = "beforePageDelete";
        var messageContent = {
            canvasId: exports.activedPageSvg.Id
        };
        exports.submitWPF(messageType, messageContent);
    }
    // 增加页签前后事件
    function canvasPageDeletedEvent(canvasId) {
        if (!runInWpf) {
            return;
        }
        var messageType = "pageDeleted";
        var messageContent = {
            canvasId: canvasId
        };
        exports.submitWPF(messageType, messageContent);
    }
    // 切换页签后事件
    function changedPageEvent() {
        if (!runInWpf) {
            return;
        }
        var messageType = "pageChanged";
        var messageContent = {
            canvasId: exports.activedPageSvg.Id
        };
        exports.submitWPF(messageType, messageContent);
    }
});
// event handle end
