import {SvgElementBase} from './SvgElement';
import {SvgElementShapeItem} from './SvgElement';
import {SvgElementLineItem} from './SvgElement';
import SvgUtility from './SvgUtility'

export class Rect {
    private startPoint: Point;
    private width: Number;
    private height: Number;
    constructor(point: Point, width: Number, height: Number) {
        this.startPoint = point;
        this.width = width;
        this.height = height;
    }
    get StartPoint() {
        return this.startPoint;
    }
    get Width() {
        return this.width;
    }
    get Heigth() {
        return this.width;
    }
}
export class Point {
    private x: Number;
    private y: Number;
    public constructor(x: Number, y: Number) {
        this.x = x;
        this.y = y;
    }
    get X() {
        return this.x;
    }
    get Y() {
        return this.y;
    }
}
export interface ISelectable {
    isSelected: Boolean;
}
export interface IScrollable {
    CanHorizontallyScroll: Boolean;
    CanVerticallyScroll: Boolean;
    GetHorizontalOffset(): Number;
    GetVerticalOffset(): Number;
    SetHorizontalOffset(offset: Number);
    SetVerticalOffset(offset: Number);
}

export class SelectService {
    private ISelectableCollection: ISelectable[] = [];
    //设置所选的项
    public SetSelected(able: ISelectable) {
        if (this.ISelectableCollection.length != 0) {
            this.ClearCollection();
        }
        able.isSelected = true;
        this.ISelectableCollection.push(able);
    }
    //获取所选的集合
    public GetSelectableCollection(): ISelectable[] {
        return this.ISelectableCollection;
    }
    // 清空集合
    public ClearCollection() {
        let len = this.ISelectableCollection.length;
        for (let i = 0; i < len; i++) {
            let item = this.ISelectableCollection[i];
            item.isSelected = false;
        }
        this.ISelectableCollection = [];
    }

    // 加入选中结合
    public AddSelected(able: ISelectable) {
        able.isSelected = true;
        this.ISelectableCollection.push(able);
    }

    // 移除选中集合
    public ReomveSelected(able: ISelectable) {
        let len = this.ISelectableCollection.length;
        for (let i = 0; i < len; i++) {
            let item = this.ISelectableCollection[i];
            if (item == able) {
                able.isSelected = false;
                this.ISelectableCollection.splice(i, 1);
                break;
            }
        }
    }
	// 判断是否包含元素
    public HasSelectedItem(able: ISelectable) {
        let len = this.ISelectableCollection.length;
        for (let i = 0; i < len; i++) {
            let item = this.ISelectableCollection[i];
            if (item == able) {
                return true;
            }
        }
        return false;
    }
}
export class SvgCanvas implements IScrollable {
    //画布宿主元素
    private rootelement: HTMLElement;
    //水平方向是否能滚动
    public CanHorizontallyScroll: Boolean;
    //垂直方向是否能滚动
    public CanVerticallyScroll: Boolean;
    //垂直方向偏移
    public VerticalOffset: String;
    //视口高度
    public ViewportHeight: Number;
    //视口宽度
    public ViewportWidth: Number;

    //svg 画布
    public svgCanvasElement: SVGSVGElement;
    //svg 画布
    public groupElement: Element;
    //视口宽度
    private viewBoxRect: Rect;

    private svgElementBaseCollection: SvgElementBase[] = [];

    private selectService: SelectService = null;
    public static CurrentCanvas: SvgCanvas;

    //元素是否按下左键
    private SvgCanvasElementMouseLeft: boolean = false;

    private id: String;

    private SelectSvgElement: SvgElementBase;

    private activedShape: SvgElementShapeItem;

    private activedLine: SvgElementLineItem;

    // private activedLines: Object;

    private selectedElement: SvgElementBase;

    private targetShape: SvgElementShapeItem;

    private elementMoving: boolean = false;
    private elementClicked: boolean = false;

    // private handlerPanel: Element;
    private elementOperateSvg: Element;
    private lineMidOperateSvg: Element;
    private lineEndOperateSvg: Element;
    private lineMaskOperateSvg: Element;
    private svgMaskSvg: Element;
    private lineModels: string[];

    public beforeConnectEvent;
    public elementConnectedEvent;
    public elementSelectedEvent;
    public elementDeletedEvent;
    public cancelSelectEvent;
    public elementClonedEvent;
    public beforeBreakConnectionEvent;

    private canvasWidth: number;
    private canvasHeight: number;
    private canvasScale: number = 1;
    private canvasMinWidth: number;
    private canvasMinHeight: number;

    private selectRectSvgs: Element[] = [];

    //构造函数
    constructor(element: SVGSVGElement, width: number, height: number, id?: String) {
        this.svgCanvasElement = element;
        SvgCanvas.CurrentCanvas = this;

        this.SvgCanvasWidth = width;
        this.SvgCanvasHeight = height;
        this.canvasWidth = width;
        this.canvasHeight = height;
        this.canvasMinWidth = width;
        this.canvasMinHeight = height;

        this.selectService = new SelectService();
        this.groupElement = SvgUtility.CreateSvgElement('g', [], this.svgCanvasElement);
        this.svgCanvasElement.onmousedown = (evt: MouseEvent) => { this.Onmousedown(evt); };
        this.svgCanvasElement.onmousemove = (evt: MouseEvent) => { this.OnMousemove(evt); };
        this.svgCanvasElement.onmouseup = (evt: MouseEvent) => { this.OnMouseup(evt); };
        this.CreateHandlerElement();
        if (!id) {
            this.id = SvgUtility.uuid();
        } else {
            this.id = id;
        }
    }

    // 外抛事件
    // 连接之前事件
    public onBeforeConnectElement(line, target) {
        if (this.beforeConnectEvent) {
            this.beforeConnectEvent(this, line, target);
        }
    }

    // 连接之后事件
    public onConnectedElement(line, target) {
        if (this.elementConnectedEvent) {
            this.elementConnectedEvent(this, line, target);
        }
    }

    // 元素选中之后事件
    public onElementSelected(element) {
        if (this.elementSelectedEvent) {
            this.elementSelectedEvent(this, element);
        }
    }

    // 元素删除之后事件
    public onElementDeleted() {
        if (this.elementDeletedEvent) {
            this.elementDeletedEvent(this);
        }
    }

    // 元素删除之后事件
    public onCancelSelect() {
        if (this.cancelSelectEvent) {
            this.cancelSelectEvent();
        }
    }

    // 元素克隆之后事件
    public onElementCloned(element) {
        if (this.elementClonedEvent) {
            this.elementClonedEvent(this, element);
        }
    }

    // 断开连接前事件
    public onBeforeBreakConnetion(line) {
        if (this.beforeBreakConnectionEvent) {
            this.beforeBreakConnectionEvent(this, line, line.Target);
        }
    }

    Onmousedown(evt: MouseEvent) {
        this.svgCanvasElement.deselectAll();
        if (!this.elementClicked) {
            if (this.activedLine) {
                this.activedLine.HideTangentLines();
            }
            this.activedLine = null;
            this.activedShape = null;
            this.selectedElement = null;
            this.onCancelSelect();
            this.ResetHandlerPanel();
            this.selectService.ClearCollection();
            this.ClearSelectRect();
            // console.log(this.svgCanvasElement);
        }
    }

    OnMousemove(evt: MouseEvent) {
        let svgCanvasRect = this.svgCanvasElement.getBoundingClientRect();
        if (this.activedShape && this.elementMoving) {
            let firstChild = this.activedShape.SvgElement.firstChild as SVGSVGElement;
            let bbox = firstChild.getBBox();
            let x: number = (evt.clientX - svgCanvasRect.left - this.activedShape.Offset.H || 0 - bbox.x) / this.canvasScale;
            let y: number = (evt.clientY - svgCanvasRect.top - this.activedShape.Offset.V || 0 - bbox.y) / this.canvasScale;

            this.activedShape.SetTanslate(x, y);
            this.PaperFitToContent(this.activedShape);
            // 更新所有的选中的图形、线和选中框
            this.UpdateSelectRect(this.activedShape);
            this.MoveLines(this.activedShape);
            if (this.selectService.GetSelectableCollection().length > 1) {
                this.updateSelectedElements(this.activedShape);
            }
        }

        if (this.ActivedLine && this.ActivedLine.IsDrag) {
            let cx: number = (evt.clientX - svgCanvasRect.left) / this.canvasScale;
            let cy: number = (evt.clientY - svgCanvasRect.top) / this.canvasScale;

            // update line operate points
            if (this.ActivedLine.DragType == 'middle') {
                this.lineMidOperateSvg.setAttribute('cx', cx.toString());
                this.lineMidOperateSvg.setAttribute('cy', cy.toString());
                this.lineEndOperateSvg.setAttribute('cx', this.ActivedLine.OperatePoints[1][0].toString());
                this.lineEndOperateSvg.setAttribute('cy', this.ActivedLine.OperatePoints[1][1].toString());
                this.ActivedLine.UpdateOperatePoints([cx, cy], null);
            } else {
                this.lineEndOperateSvg.setAttribute('cx', cx.toString());
                this.lineEndOperateSvg.setAttribute('cy', cy.toString());
                this.lineMidOperateSvg.setAttribute('cx', this.ActivedLine.OperatePoints[0][0].toString());
                this.lineMidOperateSvg.setAttribute('cy', this.ActivedLine.OperatePoints[0][1].toString());
                if (this.ActivedLine.Target == null || this.ActivedLine.Target == this.ActivedLine.Source) {
                    this.ActivedLine.UpdateOperatePoints(null, [cx, cy]);
                } else if (Math.abs(this.ActivedLine.OperatePoints[1][0] - cx) > 10 ||
                    Math.abs(this.ActivedLine.OperatePoints[1][1] - cy) > 10) {
                    console.log('断开连接.......');
                    // this.ActivedLine.RemoveTarget();
                    this.onBeforeBreakConnetion(this.ActivedLine);
                    this.ActivedLine.UpdateOperatePoints(null, [cx, cy]);
                }
            }
            this.ActivedLine.UpdateLinePath();

            this.groupElement.appendChild(this.lineMidOperateSvg);
            this.groupElement.appendChild(this.lineEndOperateSvg);
            this.PaperFitToContent(this.ActivedLine);

            //高亮目标shape element
            if (this.ActivedLine.Target == null && this.ActivedLine.DragType == 'end') {
                let centerPoint = SvgUtility.GetElementCenterPoint(this.activedShape);
                let operatePoints = this.ActivedLine.OperatePoints;
                let path = SvgUtility.BuildBezierPath(centerPoint, operatePoints[0], operatePoints[1], this.canvasScale);

                let shapes = this.GetSvgElementsInCanvas();
                this.targetShape = null;
                for (let i = 0; i < shapes.length; i++) {
                    let shapeItem = shapes[i];
                    if (shapeItem.ElementType != 'shape') {
                        continue;
                    } else if (shapeItem == this.activedShape) {
                        let shapeNode = shapeItem.SvgElement.firstChild as SVGSVGElement;
                        shapeNode.removeAttribute('style');
                        let intersections = SvgUtility.FindIntersection(shapeItem as SvgElementShapeItem, path);
                        if (intersections && intersections.length == 2) {//连自身
                            let shapeNode = shapeItem.SvgElement.firstChild as SVGSVGElement;
                            shapeNode.style.stroke = 'red';
                            this.targetShape = shapeItem as SvgElementShapeItem;
                            break;
                        }
                    } else {
                        let intersections = SvgUtility.FindIntersection(shapeItem as SvgElementShapeItem, path);
                        if (intersections && intersections.length == 1) {
                            let shapeNode = shapeItem.SvgElement.firstChild as SVGSVGElement;
                            shapeNode.style.stroke = 'red';
                            this.targetShape = shapeItem as SvgElementShapeItem;
                            break;
                        } else {
                            let shapeNode = shapeItem.SvgElement.firstChild as SVGSVGElement;
                            shapeNode.removeAttribute('style');
                        }
                    }
                }
            }

        }
    }

    OnMouseup(evt: MouseEvent) {
        this.svgCanvasElement.deselectAll();
        if (this.ActivedLine && this.ActivedLine.LineSvg) {
            this.ActivedLine.IsDrag = false;
            this.ActivedLine.SetOperateOffset();
            if (this.targetShape) {
                this.onBeforeConnectElement(this.ActivedLine, this.targetShape);
                this.targetShape = null;
            }
        }
    }

    // 构造页面辅助操作元素
    private CreateHandlerElement() {
        let me = this;
        let maskAttrs = [{ attr: 'display', val: 'none' }, { attr: 'fill', val: 'black' },
            { attr: 'opacity', val: '0.6' }, { attr: 'x', val: '0' }, { attr: 'y', val: '0' },
            { attr: 'width', val: this.SvgCanvasWidth }, { attr: 'height', val: this.SvgCanvasHeight }];
        this.svgMaskSvg = SvgUtility.CreateSvgElement('rect', maskAttrs, this.groupElement);
        this.svgMaskSvg.addEventListener('click', function(e) {
            me.HideLineMaskSvg();
            me.ActivedLine.RemoveTempLines(true);
        });

        let polygonAttrs = [{ attr: 'points', val: '0,0 10,8 0,15' }, { attr: 'fill', val: 'black' },
            { attr: 'display', val: 'none' }, { attr: 'stroke', val: 'stroke' }, { attr: 'cursor', val: 'default' }];
        this.elementOperateSvg = SvgUtility.CreateSvgElement('polygon', polygonAttrs, this.groupElement);

        this.elementOperateSvg.addEventListener("mousedown", function() {
            this.setAttribute("display", "none");
            me.ShowLineMaskSvg();
            me.groupElement.appendChild(me.Activedshape.SvgElement);
            me.CreateLineElement();
            me.elementClicked = true;
        });
        this.elementOperateSvg.addEventListener("mouseup", function() {
            me.elementClicked = false;
        });

        let circleAttrs = [{ attr: 'r', val: '6' }, { attr: 'cx', val: '0' },
            { attr: 'cy', val: '0' }, { attr: 'display', val: 'none' },
            { attr: 'class', val: 'lineOperator' }];
        this.lineMidOperateSvg = SvgUtility.CreateSvgElement('circle', circleAttrs, this.groupElement);

        this.lineMaskOperateSvg = SvgUtility.CreateSvgElement('circle', circleAttrs, this.groupElement);
        this.lineMaskOperateSvg.setAttribute('class', 'lineMask');

        this.lineMidOperateSvg.addEventListener("mousedown", function() {
            me.ActivedLine.IsDrag = true;
            me.ActivedLine.DragType = 'middle';
            me.elementClicked = true;
            me.selectedElement = me.activedLine;
        });

        this.lineMidOperateSvg.addEventListener("mouseup", function() {
            me.ActivedLine.IsDrag = false;
            me.elementClicked = false;
        });

        this.lineEndOperateSvg = SvgUtility.CreateSvgElement('circle', circleAttrs, this.groupElement);
        this.lineEndOperateSvg.addEventListener("mousedown", function() {
            me.ActivedLine.IsDrag = true;
            me.ActivedLine.DragType = 'end';
            me.elementClicked = true;
            me.selectedElement = me.activedLine;
        });

        this.lineEndOperateSvg.addEventListener("mouseup", function() {
            me.ActivedLine.IsDrag = false;
            me.elementClicked = false;
        });
    }

    // 更新element中的数据
    public UpdateElementData(id, dataNo, data) {
        let element = this.GetSvgElementById(id);
        let dataKey = 'data' + dataNo;
        let originData = element.BusinessData;
        originData[dataKey] = data;
    }

    // 更新element 的文本
    public UpdateElementText(id, text) {
        let element = this.GetSvgElementById(id);
        element.SetText(text);
    }

    // 连接指定的元素
    public ConnectElements(targetId, lineId) {
        let targetShape = this.GetSvgElementById(targetId) as SvgElementShapeItem;
        let line = this.GetSvgElementById(lineId) as SvgElementLineItem;
        if (targetShape) {
            line.Target = targetShape;
            let shapeNode = targetShape.SvgElement.firstChild as SVGSVGElement;
            shapeNode.removeAttribute('style');
            if (line.Target != line.Source) {
                line.UpdateLinePath();
                this.lineMidOperateSvg.setAttribute('cx', this.ActivedLine.OperatePoints[0][0].toString());
                this.lineMidOperateSvg.setAttribute('cy', this.ActivedLine.OperatePoints[0][1].toString());

                this.lineEndOperateSvg.setAttribute('cx', this.ActivedLine.OperatePoints[1][0].toString());
                this.lineEndOperateSvg.setAttribute('cy', this.ActivedLine.OperatePoints[1][1].toString());
            } else {
                line.CreateSelfLine();

                this.lineMidOperateSvg.setAttribute('cx', this.ActivedLine.OperatePoints[0][0].toString());
                this.lineMidOperateSvg.setAttribute('cy', this.ActivedLine.OperatePoints[0][1].toString());

                this.lineEndOperateSvg.setAttribute('cx', this.ActivedLine.OperatePoints[1][0].toString());
                this.lineEndOperateSvg.setAttribute('cy', this.ActivedLine.OperatePoints[1][1].toString());
            }
            this.onConnectedElement(this.ActivedLine, targetShape);
        }
    }

	// 通过Id批量移除元素
    public RemoveElementsByIds(elementIds: string[]) {
        for (let i = 0; i < elementIds.length; i++) {
            this.RemoveElementById(elementIds[i]);
        }
        this.onElementDeleted();
    }
	// 批量移除元素
    public RemoveElements(delElements) {
        for (let i = 0; i < delElements.length; i++) {
            let delElement = delElements[i];
            if (delElement) {
                this.RemoveElement(delElement);
            }
        }
        this.onElementDeleted();
    }

    // 通过Id删除画面上的元素
    private RemoveElementById(elementId) {
        let delElement = this.GetSvgElementById(elementId);
        if (delElement) {
            this.RemoveElement(delElement);
        }
    }

    // 删除画面上的元素
    private RemoveElement(delElement) {
        if (delElement) {
            if (delElement.ElementType == 'shape') {
                let element = delElement as SvgElementShapeItem;
                let lines = element.GetElementLines();
                let sourceLines = lines.sourceLines;
                let targetLines = lines.targetLines;
                this.RemoveLines(sourceLines);
                for (let i = 0; i < targetLines.length; i++) {
                    let line = targetLines[i];
                    line.Target = null;
                }
                this.RemoveFromBaseCollection(element);
                this.groupElement.removeChild(element.SvgElement);
                this.ReomveSelectRect(element);
            } else {
                this.RemoveLines([delElement as SvgElementLineItem]);
            }
            this.ResetHandlerPanel();
        }
    }

    // 删除线元素
    private RemoveLines(lines: SvgElementLineItem[]) {
        for (let i = 0; i < lines.length; i++) {
            let line = lines[i];
            this.RemoveFromBaseCollection(line);
            this.groupElement.removeChild(line.SvgElement);
        }
    }

    // 从缓存集合中删除指定的元素
    public RemoveFromBaseCollection(element) {
        for (let j = 0; j < this.svgElementBaseCollection.length; j++) {
            let item = this.svgElementBaseCollection[j];
            if (element == item) {
                this.svgElementBaseCollection.splice(j, 1);
                break;
            }
        }
    }

    //移动shape元素的时候，重新计算线的位置
    private MoveLines(shape: SvgElementShapeItem) {
        let shapeLines = shape.GetElementLines();
        let sourceLines = shapeLines['sourceLines'];
        let targetLines = shapeLines['targetLines'];
        if (sourceLines.length > 0) {
            for (let i = 0; i < sourceLines.length; i++) {
                let lineItem = sourceLines[i] as SvgElementLineItem;
                if (!lineItem.Target && lineItem.LineSvg ||
                    lineItem.Target == lineItem.Source) {
                    lineItem.DragType = null;
                    this.ResetSingleLine(lineItem);
                } else {
                    lineItem.DragType = 'end';
                    lineItem.UpdateLinePath();
                }
            }
        }
        if (targetLines.length > 0) {
            for (let i = 0; i < targetLines.length; i++) {
                let lineItem = targetLines[i] as SvgElementLineItem;
                lineItem.DragType = 'end';
                lineItem.UpdateLinePath();
            }
        }
    }

    // 拖动shape时，重置该shape上单线的位置
    private ResetSingleLine(line: SvgElementLineItem) {
        let sourceElement = line.Source.SvgElement;
        let sourceCenter = SvgUtility.GetElementCenterPoint(line.Source);
        let points = [[
            sourceCenter[0] + line.SourceOffset[0][0],
            sourceCenter[1] + line.SourceOffset[0][1]
        ], [
                sourceCenter[0] + line.SourceOffset[1][0],
                sourceCenter[1] + line.SourceOffset[1][1]
            ]];
        line.UpdateOperatePoints(points[0], points[1]);
        line.UpdateLinePath();
    }

    // 扩展或者裁剪canvas 线元素的边界计算不准确
    public PaperFitToContent(element: SvgElementBase) {
        if (!element) {
            return;
        }

        let extendW = 500;
        let extendH = 500;
        let extended = false;
        let curtailed = false;

        let ctm = element.SvgElement.getCTM();
        let bbox = element.SvgElement.getBBox();
        let offsetX = ctm.e;
        let offsetY = ctm.f;
        let width = bbox.width;
        let height = bbox.height;
        let maxOffsetX, maxOffsetY;

        if (element.ElementType == 'line') {
            offsetX = bbox.x;
            offsetY = bbox.y;
            maxOffsetX = width + offsetX;
            maxOffsetY = height + offsetY;
        } else {
            maxOffsetX = width + offsetX / this.canvasScale;
            maxOffsetY = height + offsetY / this.canvasScale;
            let shapeItem = element as SvgElementShapeItem;
            let lineData = shapeItem.GetElementLines();
            if (lineData['sourceLines'].length > 0 || lineData['targetLines'].length > 0) {
                let lines = lineData['sourceLines'].concat(lineData['targetLines']);
                let maxOffset = this.GetMaxOffsetInElements(lines);
                let maxLeft = maxOffset.maxLeft;
                let maxTop = maxOffset.maxTop;
                maxOffsetX = maxOffsetX > maxLeft ? maxOffsetX : maxLeft;
                maxOffsetY = maxOffsetY > maxTop ? maxOffsetY : maxTop;
            }
        }

        // extend canvas page
        if (this.canvasWidth < maxOffsetX) {
            this.canvasWidth += extendW;
            extended = true;
        }

        if (this.canvasHeight < maxOffsetY) {
            this.canvasHeight += extendW;
            extended = true;
        }

        //curtail canvas page
        if (!extended && (this.canvasHeight > this.canvasMinHeight ||
            this.canvasWidth > this.canvasMinWidth)) {
            let count = this.svgElementBaseCollection.length;

            let maxOffset = this.GetMaxOffsetInElements(this.svgElementBaseCollection);
            let maxLeft = maxOffset.maxLeft;
            let maxTop = maxOffset.maxTop;

            if (this.canvasWidth - extendW > maxLeft) {
                if (this.canvasWidth - extendW <= this.canvasMinWidth) {
                    this.canvasWidth = this.canvasMinWidth;
                } else {
                    this.canvasWidth -= extendW;
                }
                curtailed = true;
            }
            if (this.canvasHeight - extendH > maxTop) {
                if (this.canvasHeight - extendH <= this.canvasMinHeight) {
                    this.canvasHeight = this.canvasMinHeight;
                } else {
                    this.canvasHeight -= extendH;
                }
                curtailed = true;
            }
        }

        if (extended || curtailed) {
            this.ScaleCanvas(this.canvasScale);
        }
    }

    // 根据选择框的范围，选中页面元素
    public SelectElementsByRegion(min_x, min_y, max_x, max_y) {
        min_x = min_x / this.canvasScale;
        min_y = min_y / this.canvasScale;
        max_x = max_x / this.canvasScale;
        max_y = max_y / this.canvasScale;
        let allElements = this.svgElementBaseCollection;
        for (let i = 0, len = allElements.length; i < len; i++) {
            if (allElements[i].ElementType == 'shape') {
                let shapeElement = allElements[i] as SvgElementShapeItem;
                let translate = shapeElement.Translate;
                let bbox = shapeElement.SvgElement.getBBox();

                if (translate[0] + bbox.x > min_x && translate[1] + bbox.y > min_y) {
                    let shapeMaxX = translate[0] + bbox.x + bbox.width;
                    let shapeMaxY = translate[1] + bbox.y + bbox.height;
                    if (shapeMaxX < max_x && shapeMaxY < max_y) {
                        // 排除重复元素
                        if (!this.selectService.HasSelectedItem(shapeElement)) {
                            this.selectService.AddSelected(shapeElement);
                            this.CreateSelectRect(shapeElement);
                        }
                    }
                }
            }
        }
    }

    // 构造选中框
    public CreateSelectRect(shape: SvgElementShapeItem) {
        let bbox = shape.SvgElement.getBBox();
        let width = bbox.width + 4;
        let height = bbox.height + 4;
        let translate = shape.Translate;
        let offsetX = translate[0] + bbox.x - 2;
        let offsetY = translate[1] + bbox.y - 2;

        let rectAttrs = { class: 'selection-box', dataId: shape.Id, x: offsetX, y: offsetY, width: width, height: height };
        let rectSvg = SvgUtility.CreateSvgElement('rect', rectAttrs, this.groupElement);
        this.selectRectSvgs.push(rectSvg);
    }

    // 移除选中框
    public ReomveSelectRect(shape: SvgElementShapeItem) {
        let len = this.selectRectSvgs.length;
        for (let i = 0; i < len; i++) {
            let rectSvg = this.selectRectSvgs[i];
            let dataId = rectSvg.getAttribute('dataId');
            if (dataId == shape.Id) {
                this.groupElement.removeChild(rectSvg);
                this.selectRectSvgs.splice(i, 1);
                break;
            }
        }
    }

    // 更新选中框的位置
    private UpdateSelectRect(shape: SvgElementShapeItem) {
        let len = this.selectRectSvgs.length;
        for (let i = 0; i < len; i++) {
            let rectSvg = this.selectRectSvgs[i];
            let dataId = rectSvg.getAttribute('dataId');
            if (dataId == shape.Id) {
                let bbox = shape.SvgElement.getBBox();
                let translate = shape.Translate;
                let offsetX = translate[0] + bbox.x - 2;
                let offsetY = translate[1] + bbox.y - 2;
                rectSvg.setAttribute('x', offsetX.toFixed(2));
                rectSvg.setAttribute('y', offsetY.toFixed(2));
                break;
            }
        }
    }

    // 清除所有的选择框
    public ClearSelectRect() {
        let len = this.selectRectSvgs.length;
        for (let i = 0; i < len; i++) {
            let rectSvg = this.selectRectSvgs[i];
            this.groupElement.removeChild(rectSvg);
        }
        this.selectRectSvgs = [];
    }

    // 获取页面元素中距左和上的最大边界值
    private GetMaxOffsetInElements(elements) {
        let maxLeft = 0;
        let maxTop = 0;
        let count = elements.length;
        for (let i = 0; i < count; i++) {
            let item = elements[i];
            let ctm = item.SvgElement.getCTM();
            let bbox = item.SvgElement.getBBox();
            let offsetX = ctm.e;
            let offsetY = ctm.f;
            let width = bbox.width;
            let height = bbox.height;
            let itemLeft = width + offsetX / this.canvasScale;
            let itemTop = height + offsetY / this.canvasScale;
            if (item.ElementType == 'line') {
                offsetX = bbox.x;
                offsetY = bbox.y;
                itemLeft = width + offsetX;
                itemTop = height + offsetY;
            }

            if (itemLeft > maxLeft) {
                maxLeft = itemLeft;
            }
            if (itemTop > maxTop) {
                maxTop = itemTop;
            }
        }

        return {
            maxLeft: maxLeft,
            maxTop: maxTop
        }
    }

    // 构造线对象
    public CreateLineElement() {
        new SvgElementLineItem(this, this.activedShape);
    }

    // 重置操作panel的显示
    public ResetHandlerPanel(element?: SvgElementBase) {
        if (element) {
            if (element.ElementType.toUpperCase() == 'LINE') {

                let points = element['operatePoints'];
                this.lineMidOperateSvg.setAttribute('cx', points[0][0].toString());
                this.lineMidOperateSvg.setAttribute('cy', points[0][1].toString());
                this.lineMidOperateSvg.setAttribute('display', 'block');
                this.groupElement.appendChild(this.lineMidOperateSvg);

                this.lineEndOperateSvg.setAttribute('cx', points[1][0].toString());
                this.lineEndOperateSvg.setAttribute('cy', points[1][1].toString());
                this.lineEndOperateSvg.setAttribute('display', 'block');
                this.groupElement.appendChild(this.lineEndOperateSvg);

            } else {
                let svgElement = element.SvgElement;
                let transfrom = svgElement.getAttribute('transform');
                let firstChild = svgElement.firstChild as SVGSVGElement;
                let bbox = firstChild.getBBox();

                this.elementOperateSvg.setAttribute('transform', transfrom +
                    ' translate(' + (bbox.width + bbox.x + 1) + ',' + (bbox.height / 2 + bbox.y - 5) + ')');
                this.elementOperateSvg.setAttribute('display', 'block');
                this.groupElement.appendChild(this.elementOperateSvg);
            }
        } else {
            this.elementOperateSvg.setAttribute('display', 'none');
            this.lineMidOperateSvg.setAttribute('display', 'none');
            this.lineEndOperateSvg.setAttribute('display', 'none');
            if (this.activedLine) {
                this.activedLine.HideTangentLines();
            }
        }
    }

    // 通过id获取element对象
    public GetSvgElementById(id: string) {
        let allElements = this.svgElementBaseCollection;
        for (let i = 0, len = allElements.length; i < len; i++) {
            let itemId = allElements[i].Id;
            if (itemId === id) {
                return allElements[i];
            }
        }
        return null;
    }

    // 显示线蒙层
    private ShowLineMaskSvg() {
        let centerPoint = SvgUtility.GetElementCenterPoint(this.Activedshape);
        let firstChild = this.Activedshape.SvgElement.firstChild as SVGSVGElement;
        let bbox = firstChild.getBBox();
        this.lineMaskOperateSvg.setAttribute('cx', centerPoint[0].toString());
        this.lineMaskOperateSvg.setAttribute('cy', centerPoint[1].toString());
        this.lineMaskOperateSvg.setAttribute('r', (bbox.width + 50).toString());
        this.lineMaskOperateSvg.setAttribute('display', 'block');
        this.svgMaskSvg.setAttribute('display', 'block');
        this.groupElement.appendChild(this.svgMaskSvg);
        this.groupElement.appendChild(this.lineMaskOperateSvg);
    }

    // 隐藏线蒙层
    public HideLineMaskSvg() {
        this.lineMaskOperateSvg.setAttribute('display', 'none');
        this.svgMaskSvg.setAttribute('display', 'none');
        this.selectedElement = null;
        this.onCancelSelect();
        this.ResetHandlerPanel();
    }

    // 更新所有选中元素的相对offset
    public updateSelectedElementsOffset(shape: SvgElementShapeItem) {
        let selectedElements = this.selectService.GetSelectableCollection();
        let shapeX = shape.Translate[0];
        let shapeY = shape.Translate[1];
        let len = selectedElements.length;
        for (let i = 0; i < len; i++) {
            let item = selectedElements[i] as SvgElementShapeItem;
            let itemX = item.Translate[0], itemY = item.Translate[1];
            item.RelativeOffsetX = shapeX - itemX;
            item.RelativeOffsetY = shapeY - itemY;
        }

    }

    // 更新选中图形的位置
    private updateSelectedElements(shape: SvgElementShapeItem) {
        let selectedElements = this.selectService.GetSelectableCollection();
        let shapeX = shape.Translate[0];
        let shapeY = shape.Translate[1];
        let len = selectedElements.length;
        for (let i = 0; i < len; i++) {
            let item = selectedElements[i] as SvgElementShapeItem;
            if (item.Id == shape.Id) {
                continue;
            }
            let x = shapeX - item.RelativeOffsetX;
            let y = shapeY - item.RelativeOffsetY;
            item.SetTanslate(x, y);
            this.UpdateSelectRect(item);
            this.MoveLines(item);
            this.PaperFitToContent(item);
        }
    }

    // 显示画布
    public Show() {
        this.svgCanvasElement.setAttribute('display', 'block');
        SvgCanvas.CurrentCanvas = this;
    }

    // 隐藏画布
    public Hide() {
        this.svgCanvasElement.setAttribute('display', 'none');
    }

    // 销毁该画布
    public Distory() {
        this.svgCanvasElement.parentNode.removeChild(this.svgCanvasElement);
    }

    // 画布缩放
    public ScaleCanvas(scale: number) {
        this.canvasScale = scale;
        this.groupElement.setAttribute('transform', 'scale(' + scale + ')');

        this.svgCanvasElement.setAttribute('width', (this.canvasWidth * scale).toFixed(2));
        this.svgCanvasElement.setAttribute('height', (this.canvasHeight * scale).toFixed(2));

        this.svgMaskSvg.setAttribute('width', this.canvasWidth.toFixed(2));
        this.svgMaskSvg.setAttribute('height', this.canvasHeight.toFixed(2));
    }

    // 改变指定元素的业务类型
    public ChangeElementByOutside(id, targetType) {
        let element = this.GetSvgElementById(id);
        if (element.ElementType == 'shape') {
            element = element as SvgElementShapeItem;

        } else {
            element = element as SvgElementLineItem;
        }
    }

    // 生成副本
    public CloneShapeElement(operateShape) {
        // let operateShape = this.GetSvgElementById(shapeId);
        if (operateShape) {
            let clonedNode = operateShape.SvgElement.cloneNode(true);
            let clonedShapeItem = new SvgElementShapeItem(clonedNode as SVGSVGElement, this);
            clonedShapeItem.SetTanslate(operateShape.Translate[0] + 100, operateShape.Translate[1] + 50);
            clonedShapeItem.BusinessType = operateShape.BusinessType;
            clonedShapeItem.BusinessData = operateShape.BusinessData;
            clonedShapeItem.Links = operateShape.Links;
            clonedShapeItem.ClonedId = operateShape.Id;

            this.selectedElement = clonedShapeItem;
            this.activedShape = clonedShapeItem;
            this.PaperFitToContent(clonedShapeItem);
            this.onElementCloned(clonedShapeItem);
        }
    }

    set Activedshape(element: SvgElementShapeItem) {
        this.activedShape = element;
    }
    get Activedshape() {
        return this.activedShape;
    }

    set LineElement(element: SvgElementLineItem) {
        this.activedLine = element;
    }

    get ActivedLine() {
        return this.activedLine;
    }

    set ActivedLine(element: SvgElementLineItem) {
        this.activedLine = element;
    }

    get LineModels() {
        return this.lineModels;
    }

    set LineModels(models) {
        this.lineModels = models;
    }
    set ElementMoving(moving: boolean) {
        this.elementMoving = moving;
    }

    set ElementClicked(selected: boolean) {
        this.elementClicked = selected;
    }

    set SelectedElement(element) {
        this.selectedElement = element;
        if (element) {
            this.onElementSelected(element);
        }
    }

    get SelectedElement() {
        return this.selectedElement;
    }
    get CanvasScale() {
        return this.canvasScale;
    }

    public removeActivedElement() {
        this.activedShape = undefined;
    }
    get SelectService(): SelectService {
        return this.selectService;
    }
    //获取 画布宽度
    get SvgCanvasWidth(): Number {
        return new Number(this.svgCanvasElement.getAttribute("width"));
    }
    //设置 画布宽度
    set SvgCanvasWidth(newWidth: Number) {
        this.svgCanvasElement.setAttribute("width", newWidth.toString())
    }
    //获取 画布宽度
    get SvgCanvasHeight(): Number {
        return new Number(this.svgCanvasElement.getAttribute("height"));
    }

    //获取画布Id
    get Id(): String {
        return this.id;
    }
    //获取画布Id
    set Id(id: String) {
        this.id = id
    }

    private setViewBox(rect: Rect) {
        let viewBoxValue: string = rect.StartPoint.X.toString() + " " + rect.StartPoint.Y.toString() + " " + rect.Width.toString() + " " + rect.Heigth.toString();
        this.svgCanvasElement.setAttribute("viewBox", viewBoxValue);
    }
    //设置 画布宽度
    set SvgCanvasHeight(newheight: Number) {
        this.svgCanvasElement.setAttribute("height", newheight.toString())
    }

    public GetHorizontalOffset(): Number {
        let str: String = this.svgCanvasElement.getAttribute("viewBox");
        let horizontalOffset: Number = 0;
        if (str != null) {
            let viewBoxArray: string[] = str.split(" ");;
            horizontalOffset = new Number(viewBoxArray[0]);
        }
        return horizontalOffset;
    }

    public GetVerticalOffset(): Number {
        let str: String = this.svgCanvasElement.getAttribute("viewBox");
        let verticalOffset: Number = 0;
        if (str != null) {
            let viewBoxArray: string[] = str.split(" ");;
            verticalOffset = new Number(viewBoxArray[1]);
        }
        return verticalOffset;
    }

    public SetHorizontalOffset(offset: Number) {
        if (this.viewBoxRect != null) {
            this.viewBoxRect.StartPoint.X = offset;
            this.setViewBox(this.viewBoxRect);
        }
    }

    public SetVerticalOffset(offset: Number) {
        if (this.viewBoxRect != null) {
            this.viewBoxRect.StartPoint.Y = offset;
            this.setViewBox(this.viewBoxRect);
        }

    }

    public SetBackgroundColor(color: string) {
        this.svgCanvasElement.style.backgroundColor = color;
    }
    //获取画布位置
    public getBoundingClientRect(): ClientRect {

        return this.svgCanvasElement.getBoundingClientRect();
    }
    //添加到画布
    public AddSvgElementBaseCollection(svgElementBase: SvgElementBase) {
        this.svgElementBaseCollection.push(svgElementBase);
    }

    public GetSvgElementsInCanvas() {
        return this.svgElementBaseCollection;
    }
}
