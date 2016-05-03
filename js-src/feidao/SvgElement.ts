
import {SvgCanvas} from './SvgCanvas';
import {SvgUtility} from './SvgUtility';

let notifyAddedEvent;

export function registerElementAddedEvent(eventFn) {
  notifyAddedEvent = eventFn;
};

export class SvgElementBase {
  protected isDrag: boolean;
  protected id: String;
  protected title: String
  protected text: String;
  protected elementType: String;
  protected businessType: String;
  protected businessData: Object;
  protected xmlElement: String;
  //当前结点的根节点
  protected svgElement: SVGSVGElement;
  protected svgCanvas: SvgCanvas;
  //图形是否选中状态
  public isSelected: boolean = false;
  constructor(svgElement: SVGSVGElement, svgCanvas: SvgCanvas, id?: string) {
    svgElement.removeAttribute('transform');
    this.svgElement = svgElement;
    this.svgCanvas = svgCanvas;
    if (!id) {
      id = SvgUtility.uuid();
    }
    this.id = id;
    this.businessData = { data1: '', data2: '', data3: '', data4: '', data5: '' };
    svgCanvas.AddSvgElementBaseCollection(this);
    svgCanvas.groupElement.appendChild(svgElement);
  }

  public SetTanslate(x: Number, y: Number): void {
    this.svgElement.setAttribute("transform", "translate(" + x + "," + y + ")");
  }

  public SetText(text: String, isHide?: boolean) {
    this.text = text;
  }

  //获取元素Id
  get Id(): String {
    return this.id;
  }
  //设置元素Id
  set Id(id: String) {
    this.id = id
  }
  //获取 Text
  get Text(): String {
    return this.text;
  }
  //设置 Text
  set Text(text: String) {
    this.text = text;
  }

  get SvgCanvas() {
    return this.svgCanvas;
  }

  get SvgElement() {
    return this.svgElement;
  }

  set SvgElement(svgElement: SVGSVGElement) {
    this.svgElement = svgElement;
  }

  get ElementType() {
    return this.elementType;
  }

  set ElementType(elementType: String) {
    this.elementType = elementType;
  }

  set BusinessType(type) {
    this.businessType = type;
  }

  get BusinessType() {
    return this.businessType;
  }

  set BusinessData(data) {
    this.businessData = data;
  }

  get BusinessData() {
    return this.businessData;
  }

  set IsSelected(selected: boolean) {
    this.isSelected = selected;
  }

  get IsSelected() {
    return this.isSelected;
  }

  get IsDrag() {
    return this.isDrag;
  }

  set IsDrag(isDrag) {
    this.isDrag = isDrag;
  }
}

export class SvgElementShapeItem extends SvgElementBase implements ISelectable {
  private HorizontalOffset: number;
  private VerticalOffset: number;
  private translate: number[];
  private links: Object[];
  private clonedId: string = '';
  private relativeOffsetX: number;//相对偏移
  private relativeOffsetY: number;
  private scale: number[] = [1, 1];
  private textSvgs: Element[] = [];
  private textArrays: string[];
  private shapeColor: string;
  constructor(svgElement: SVGSVGElement, svgCanvas: SvgCanvas, id?: string) {
    super(svgElement, svgCanvas, id);
    this.elementType = 'shape';
    this.svgElement.setAttribute('cursor', 'default');
    this.InitTextNode();
    //元素加载事件
    this.RegisterEvent();
  }

  // 注册事件
  public RegisterEvent() {
    this.svgElement.onmousedown = (evt: MouseEvent) => { this.OnMouseDown(evt); };
    this.svgElement.onmousemove = (evt: MouseEvent) => { this.OnDrag(evt); };
    this.svgElement.onmouseup = (evt: MouseEvent) => { this.EndDrag(evt); };
  }

  // mousedown 事件
  public OnMouseDown(evt: MouseEvent): void {
    this.svgCanvas.ResetHandlerPanel();
    this.svgCanvas.ElementClicked = true;
    this.svgElement.setAttribute('cursor', 'move');
    let svgElementRect = this.svgElement.getBoundingClientRect();
    this.HorizontalOffset = evt.clientX - svgElementRect.left;
    this.VerticalOffset = evt.clientY - svgElementRect.top;
    if (this.svgCanvas.TempLine && !this.svgCanvas.TempLine.LineSvg) {
      this.svgCanvas.TempLine.RemoveTempLines(true);
    }
    this.svgCanvas.groupElement.appendChild(this.svgElement);

    let ctrlKey = evt.ctrlKey;
    if (ctrlKey) {
      if (!this.isSelected) {
        this.svgCanvas.SelectService.AddSelected(this);
        this.svgCanvas.CreateSelectRect(this);
      } else {
        this.svgCanvas.SelectService.ReomveSelected(this);
        this.svgCanvas.ReomveSelectRect(this);
      }
      return;
    }
    this.isDrag = true;
    // 当该元素不在所选元素中的时候，移除所有选中元素，并将该元素置为选中状态
    if (!this.svgCanvas.SelectService.HasSelectedItem(this)) {
      this.svgCanvas.ClearSelectRect();
      this.svgCanvas.CreateSelectRect(this);
      this.svgCanvas.SelectService.ClearCollection();
      this.svgCanvas.SelectService.SetSelected(this);
    } else {
      this.svgCanvas.updateSelectedElementsOffset(this);
    }

    this.svgCanvas.ResetHandlerPanel(this);

    this.svgCanvas.SelectedElement = this;
  }
  // mousemove 事件
  public OnDrag(evt: MouseEvent): void {
    if (this.isDrag) {
      this.svgCanvas.ResetHandlerPanel();
      this.svgElement.setAttribute('opacity', '0.8');
    }
  }
  // mouseup 事件
  public EndDrag(evt: MouseEvent): void {
    this.isDrag = false;
    this.HorizontalOffset = 0;
    this.VerticalOffset = 0;
    this.svgElement.setAttribute('cursor', 'default');
    if (this.svgCanvas.SelectedElement == this && !evt.ctrlKey) {
      this.svgCanvas.ResetHandlerPanel(this);
    }
    this.svgCanvas.ElementClicked = false;
    this.GetElementLines();
    this.svgElement.removeAttribute('opacity');
  }

  // 获取与该图形相关的线
  public GetElementLines() {
    let allElements = this.svgCanvas.GetSvgElementsInCanvas();
    let sourcetlines = [];
    let targetlines = [];
    for (let i = 0; i < allElements.length; i++) {
      let element = allElements[i];
      if (element.ElementType == 'line') {
        if (element['source'].Id == this.id) {
          sourcetlines.push(element);
        }
        if (element['target'] && element['target'].Id == this.id && element['target'].Id != element['source'].Id) {
          targetlines.push(element);
        }
      }
    }
    return {
      'sourceLines': sourcetlines as SvgElementLineItem[],
      'targetLines': targetlines as SvgElementLineItem[]
    };
  }
  // 设置translate
  public SetTanslate(x: number, y: number) {
    x = Number(x.toFixed(2));
    y = Number(y.toFixed(2));
    super.SetTanslate(x, y);
    this.translate = [x, y];
  }

  // 获取图形元素组 g
  public GetShapeGroup() {
    return this.svgElement.firstChild as SVGSVGElement;
  }

  // 获取第一个图形元素
  public GetFirstShapeElement() {
    return this.svgElement.firstChild.firstChild as SVGSVGElement;
  }

  // 获取图形组的bbox
  public GetShapeBBox() {
    let shapeGroup = this.GetShapeGroup();
    let bbox = shapeGroup.getBBox();
    let clientRect = shapeGroup.getBoundingClientRect();
    bbox.width = clientRect.width;
    bbox.height = clientRect.height;
    return bbox;
  }

  // 初始化text node，设置text node的偏移量并构造tspans缓存
  public InitTextNode() {
    let nodes = this.svgElement.childNodes;
    this.textArrays = new Array();
    for (let i = 0; i < nodes.length; i++) {
      if (nodes[i].nodeName == 'text') {
        let text_node = nodes[i] as HTMLElement;
        this.TranslateText(text_node);
        this.textSvgs.push(text_node);
      }
    }
  }

  // 重设shape大小
  public Resize(width, height, left, top) {
    let bbox = this.GetShapeBBox();
    let originalW = bbox.width / this.scale[0];
    let originalH = bbox.height / this.scale[1];
    let scaleX = (width / originalW).toFixed(2);
    let scaleY = (height / originalH).toFixed(2);
    this.SetTanslate(left, top);
    this.SetScale(scaleX + ',' + scaleY);
  }

  // 设置scale
  public SetScale(scale) {
    let scalableGroup = this.GetShapeGroup();
    scalableGroup.setAttribute('transform', 'scale(' + scale + ')');
    let scaleArray = scale.split(',');
    let scaleX = scaleArray[0];
    let scaleY = scaleX;
    if (scaleArray.length == 2) {
      scaleY = scaleArray[1];
    }
    this.scale = [scaleX, scaleY];
    if (this.svgCanvas.SelectedElement == this) {
      this.svgCanvas.ReomveSelectRect(this);
      this.svgCanvas.CreateSelectRect(this);
    }

    for (let i = 0; i < this.textSvgs.length; i++) {
      let textNode = this.textSvgs[i];
      this.TranslateText(textNode);
    }
    // 更新 已连接的线
    this.updateLines();
  }
  // 更新当前已连接线的path
  private updateLines() {
    let elementLines = this.GetElementLines();
    let lines = elementLines.sourceLines.concat(elementLines.targetLines);
    let count = lines.length;
    for (let i = 0; i < count; i++) {
      let line = lines[i];
      line.UpdateLinePath();
    }
  }

  // 设置text
  public SetText(text: string, isHide?: boolean, textIdx?: number) {
    let textSvg = this.textSvgs[0] as HTMLElement;
    if (textIdx != undefined) {
      textSvg = this.textSvgs[textIdx] as HTMLElement;
      this.textArrays[textIdx] = text;
    } else {
      this.textArrays[0] = text;
    }
    if (textSvg) {
      if (isHide || text.trim().length == 0) {
        textSvg.setAttribute('display', 'none');
        this.text = '';
        textSvg.innerHTML = '';
      } else if (text.trim().length > 0) {
        textSvg.removeAttribute('display');
        this.text = text;
        textSvg.innerHTML = text.toString();
      }
    }
  }

  // 设置图形颜色
  public SetColor(color) {
    let firstChild = this.GetFirstShapeElement();
    firstChild.setAttribute('fill', color);
    this.shapeColor = color;
  }

  // 设置text的translate
  private TranslateText(textNode) {
    let centerPoint = SvgUtility.getElementCenterPoint(this, this.svgCanvas.CanvasScale);
    let canvasScale = this.svgCanvas.CanvasScale;
    let translateX = textNode.getAttribute('positionX') || 0;
    let translateY = textNode.getAttribute('positionY') || 0;
    let bbox = this.GetShapeBBox();
    let centerX = (bbox.width / canvasScale) / 2;
    let centerY = (bbox.height / canvasScale) / 2;
    if (translateX == 'center') {
      translateX = centerX;
    } else {
      translateX = translateX * this.scale[0];
    }
    if (translateY == 'center') {
      translateY = centerY;
    } else {
      translateY = translateY * this.scale[1];
    }

    textNode.setAttribute('transform', 'translate(' + translateX + ',' + translateY + ')');
  }

  get ShapeColor() {
    return this.shapeColor;
  }

  get Text() {
    return this.textArrays.join('|');;
  }

  get Scale() {
    return this.scale;
  }

  set Links(links: Object[]) {
    this.links = links;
  }

  get Links() {
    return this.links;
  }

  get Translate() {
    return this.translate;
  }

  get Offset() {
    return { H: this.HorizontalOffset, V: this.VerticalOffset };
  }

  get ClonedId() {
    return this.clonedId;
  }

  set ClonedId(shapeId) {
    this.clonedId = shapeId;
    this.SetColor('#FFA500');
  }

  get RelativeOffsetX() {
    return this.relativeOffsetX;
  }

  set RelativeOffsetX(x: number) {
    this.relativeOffsetX = x;
  }

  get RelativeOffsetY() {
    return this.relativeOffsetY;
  }

  set RelativeOffsetY(y: number) {
    this.relativeOffsetY = y;
  }

}

export class SvgElementLineItem extends SvgElementBase {
  private source: SvgElementShapeItem;
  private target: SvgElementShapeItem;
  private operatePoints: number[][];
  private operateOffset: number[][];
  private dragType: string;//middle, end
  private operateScale: number;
  private operateHeight: number;
  private pathZone;
  private lineSvg;
  private textSvg;
  private tempLines: Object[];
  private lineEllipse;
  private tangentLines: Element[];

  constructor(svgCanvas: SvgCanvas, source: SvgElementShapeItem, id?: string) {

    let gElement = SvgUtility.createSvgElement('g', [{ 'attr': 'class', 'val': 'line' }]);
    super(gElement as SVGSVGElement, svgCanvas, id);
    this.source = source;
    this.elementType = 'line';

    if (!id) {
      this.CreateTempLines();
      this.svgCanvas.TempLine = this;
    }
  }

  public InitByData(linkInfo) {
    this.CreateRealLine(0, 0, linkInfo);
    if (this.target == this.source) {
      this.CreateSelfLine();
    }
  }

  public UpdateLinePath(initByData?: boolean) {
    if (this.target == this.source) {
      this.UpdateSelfLine();
      return;
    }
    let canvasScale = this.svgCanvas.CanvasScale;
    let centerPoint = SvgUtility.getElementCenterPoint(this.source, canvasScale);
    let startPoint = centerPoint;
    let middlePoint = this.operatePoints[0];
    let endPoint = this.operatePoints[1];
    if (this.target) {
      // 算比例和高度的时候，需要用两个中心点算
      endPoint = SvgUtility.getElementCenterPoint(this.target, canvasScale);
    }

    if (initByData || this.dragType == 'middle') {
      let data = SvgUtility.getScaleAndHeightByMiddlePoint(startPoint, endPoint, middlePoint);
      this.operateScale = data.scale;
      this.operateHeight = data.height;
    } else {
      let scalePoint = SvgUtility.getPointOnLineByScale(startPoint, endPoint, this.operateScale);
      let k = SvgUtility.getLineSlope(startPoint, endPoint);
      let direction = middlePoint[1] - scalePoint[1];

      let tempMiddlePoint = SvgUtility.getMiddlePointOnMove(scalePoint, -1 / k, this.operateHeight, direction);
      if (tempMiddlePoint[0] != null && !isNaN(tempMiddlePoint[0]) &&
        tempMiddlePoint[1] != null && !isNaN(tempMiddlePoint[0])) {
        middlePoint = tempMiddlePoint;
        this.UpdateOperatePoints(middlePoint, null);
      }
    }

    let path = SvgUtility.buildBezierPath(startPoint, middlePoint, endPoint, canvasScale);
    let startIntersection = SvgUtility.findIntersection(this.source.GetFirstShapeElement(), path);
    if (startIntersection) {
      startPoint = [startIntersection[0]['x'] / canvasScale, startIntersection[0]['y'] / canvasScale];
    }

    if (this.target) {
      let endIntersection = SvgUtility.findIntersection(this.target.GetFirstShapeElement(), path);
      if (endIntersection) {
        endPoint = [endIntersection[0]['x'] / canvasScale, endIntersection[0]['y'] / canvasScale];
        this.UpdateOperatePoints(null, endPoint);
      } else {
        // 解决Raphael找不到交点的bug
        console.log('not found intersection...');
        //endPoint = this.operatePoints[1];
      }
    }
    // 构造真正的path的时候 startPoint 与 endPoint 更改为实际的交点
    let linePath = SvgUtility.buildBezierPath(startPoint, middlePoint, endPoint);
    this.lineSvg.setAttribute('d', linePath);
    // 解决IE 不更新line的bug
    //this.svgCanvas.svgCanvaselement.appendChild(this.svgElement);
    this.pathZone.setAttribute('d', linePath);
    this.textSvg.setAttribute('dx', middlePoint[0]);
    this.textSvg.setAttribute('dy', middlePoint[1]);
  }

  // 创建连接图形自身的线
  public CreateSelfLine() {
    if (this.target != this.source) {
      return;
    }
    let x1, x2, y1, y2;
    let bbox = this.source.GetShapeBBox();
    let elementWidth = bbox.width;
    let canvasScale = this.svgCanvas.CanvasScale;
    let centerPoint = SvgUtility.getElementCenterPoint(this.source, canvasScale);
    x1 = centerPoint[0] - elementWidth / 2;
    x2 = centerPoint[0] + elementWidth / 2;
    y1 = centerPoint[1] - elementWidth;
    y2 = centerPoint[1] - elementWidth;
    let path = 'M ' + centerPoint[0] + ',' + centerPoint[1] + 'C' + x1 + ',' + y1 + ' ' + x2 + ',' + y2 + ' ' + centerPoint[0] + ',' + centerPoint[1];

    let startIntersection = SvgUtility.findIntersection(this.source.GetFirstShapeElement(), path);
    if (startIntersection && startIntersection.length == 2) {
      let startPoint = startIntersection[0];
      let endPoint = startIntersection[1];
      if (startPoint['x'] > endPoint['x']) {
        startPoint = startIntersection[1];
        endPoint = startIntersection[0];
      }
      let linePath = 'M ' + startPoint['x'] + ',' + startPoint['y'] + 'C' + x1 + ',' + y1 + ' ' + x2 + ',' + y2 + ' ' + endPoint['x'] + ',' + endPoint['y'];
      this.lineSvg.setAttribute('d', linePath);
      this.pathZone.setAttribute('d', linePath);
      this.UpdateOperatePoints([x1, y1], [x2, y2]);

      this.textSvg.setAttribute('dx', (x1 + x2) / 2);
      this.textSvg.setAttribute('dy', (y1 + y2) / 2);
      this.SetOperateOffset();
      this.tangentLines = [];
      this.tangentLines.push(this.CreateTangentLine([startPoint['x'], startPoint['y']], this.operatePoints[0]));
      this.tangentLines.push(this.CreateTangentLine([endPoint['x'], endPoint['y']], this.operatePoints[1]));
    }
  }

  // 更新self line
  private UpdateSelfLine() {
    let canvasScale = this.svgCanvas.CanvasScale;
    let centerPoint = SvgUtility.getElementCenterPoint(this.source, canvasScale);
    let path = 'M ' + centerPoint[0] + ',' + centerPoint[1] + 'C' + this.operatePoints[0][0] + ',' + this.operatePoints[0][1] + ' ' + this.operatePoints[1][0] + ',' + this.operatePoints[1][1] + ' ' + centerPoint[0] + ',' + centerPoint[1];
    let startIntersection = SvgUtility.findIntersection(this.source.GetFirstShapeElement(), path);
    if (startIntersection && startIntersection.length == 2) {
      let startPoint = startIntersection[0];
      let endPoint = startIntersection[1];
      if (startPoint['x'] > endPoint['x']) {
        startPoint = startIntersection[1];
        endPoint = startIntersection[0];
      }
      let linePath = 'M ' + startPoint['x'] + ',' + startPoint['y'] + 'C' + this.operatePoints[0][0] + ',' + this.operatePoints[0][1] + ' ' + this.operatePoints[1][0] + ',' + this.operatePoints[1][1] + ' ' + endPoint['x'] + ',' + endPoint['y'];
      this.lineSvg.setAttribute('d', linePath);
      this.pathZone.setAttribute('d', linePath);
      this.textSvg.setAttribute('dx', (this.operatePoints[0][0] + this.operatePoints[1][0]) / 2);
      this.textSvg.setAttribute('dy', (this.operatePoints[0][1] + this.operatePoints[1][1]) / 2);

      let tangentLinePath1 = 'M' + startPoint['x'] + ',' + startPoint['y'] + 'L' +
        this.operatePoints[0][0] + ',' + this.operatePoints[0][1];

      let tangentLinePath2 = 'M' + endPoint['x'] + ',' + endPoint['y'] + ' L' +
        this.operatePoints[1][0] + ',' + this.operatePoints[1][1];

      this.tangentLines[0].setAttribute('d', tangentLinePath1);
      this.tangentLines[1].setAttribute('d', tangentLinePath2);
      if (this.dragType) {
        this.ShowTangentLines();
      }
    }
  }

  // 构造直线
  public CreateStraightLine() {
    if (!this.target) {
      return;
    }
    let canvasScale = this.svgCanvas.CanvasScale;
    let centerPoint = SvgUtility.getElementCenterPoint(this.source, canvasScale);
    let targetCenterPoint = SvgUtility.getElementCenterPoint(this.target, canvasScale);

    let startPoint, endPoint;

    let path = 'M' + centerPoint[0] * canvasScale + ',' + centerPoint[1] * canvasScale +
      ' L' + targetCenterPoint[0] * canvasScale + ',' + targetCenterPoint[1] * canvasScale;
    let startIntersection = SvgUtility.findIntersection(this.source.GetFirstShapeElement(), path);
    let endIntersection = SvgUtility.findIntersection(this.target.GetFirstShapeElement(), path);
    if (startIntersection) {
      startPoint = [startIntersection[0]['x'] / canvasScale, startIntersection[0]['y'] / canvasScale];
    }
    if (endIntersection) {
      endPoint = [endIntersection[0]['x'] / canvasScale, endIntersection[0]['y'] / canvasScale];
    }
    if (startPoint && endPoint) {
      let middlePoint = [(startPoint[0] + endPoint[0]) / 2, (startPoint[1] + endPoint[1]) / 2];
      this.UpdateOperatePoints(middlePoint, endPoint);
      let linePath = 'M' + startPoint[0] + ',' + startPoint[1] + ' L' + endPoint[0] + ',' + endPoint[1];
      this.lineSvg.setAttribute('d', linePath);
      this.pathZone.setAttribute('d', linePath);
      this.textSvg.setAttribute('dx', middlePoint[0]);
      this.textSvg.setAttribute('dy', middlePoint[1]);
      this.svgCanvas.ResetHandlerPanel();
    }
  }
  // 更新操作点
  public UpdateOperatePoints(middlePoint: number[], endPoint: number[]) {
    if (middlePoint) {
      this.operatePoints[0][0] = parseFloat(middlePoint[0].toFixed(2));
      this.operatePoints[0][1] = parseFloat(middlePoint[1].toFixed(2));
    }
    if (endPoint) {
      this.operatePoints[1][0] = parseFloat(endPoint[0].toFixed(2));
      this.operatePoints[1][1] = parseFloat(endPoint[1].toFixed(2));
    }
  }

  // 设置操作点局中心的偏移量
  public SetOperateOffset() {
    let canvasScale = this.svgCanvas.CanvasScale;
    let centerPoints = SvgUtility.getElementCenterPoint(this.source, canvasScale);
    this.operateOffset = [
      [this.operatePoints[0][0] - centerPoints[0],
        this.operatePoints[0][1] - centerPoints[1]],
      [this.operatePoints[1][0] - centerPoints[0],
        this.operatePoints[1][1] - centerPoints[1]]
    ]
  }

  // 隐藏切线操作线
  public HideTangentLines() {
    if (this.tangentLines && this.tangentLines.length > 0) {
      this.tangentLines[0].setAttribute('display', 'none');
      this.tangentLines[1].setAttribute('display', 'none');
    }
  }

  // 显示切线操作线
  public ShowTangentLines() {
    if (this.tangentLines && this.tangentLines.length > 0) {
      this.tangentLines[0].setAttribute('display', 'block');
      this.tangentLines[1].setAttribute('display', 'block');
    }
  }

  // 创建候选线
  private CreateTempLines() {
    if (!this.source || !this.source.Links) {
      return;
    }
    let svgCanvasRect = this.svgCanvas.svgCanvasElement.getBoundingClientRect();
    this.tempLines = [];
    let angle = Math.PI / 6;
    let links = this.source.Links;
    let gElement = this.svgElement;
    let bbox = this.source.GetShapeBBox();
    let elementWidth = bbox.width;
    let canvasScale = this.svgCanvas.CanvasScale;
    let centerPoint = SvgUtility.getElementCenterPoint(this.source, canvasScale);
    let oddCount = links.length % 2 == 0;
    let tempAngle = 0;
    if (oddCount) {
      tempAngle = angle / 2;
    }

    let tempLineLen = elementWidth + 20;
    let me = this;

    for (let i = 0; i < links.length; i++) {
      let k = 1;
      if ((i + 1) % 2 == 0) {
        k = -1;
      }
      let itemAngle = k * (i + i % 2) / 2 * angle + tempAngle;
      let h = tempLineLen * Math.sin(itemAngle);
      let w = tempLineLen * Math.cos(itemAngle);

      let x = centerPoint[0] + w;
      let y = centerPoint[1] - h;
      let circleAttrs = [{ attr: 'cx', val: x }, { attr: 'cy', val: y },
        { attr: 'r', val: 5 }, { attr: 'class', val: 'lineOperator' },
        { attr: 'lineIdx', val: i }];
      let tempOperateCircle = SvgUtility.createSvgElement('circle', circleAttrs, gElement);
      tempOperateCircle.addEventListener('mousedown', function(evt) {
        let lineIdx = this.getAttribute('lineIdx');
        let cx: number = (evt['clientX'] - svgCanvasRect.left) / me.svgCanvas.CanvasScale;
        let cy: number = (evt['clientY'] - svgCanvasRect.top) / me.svgCanvas.CanvasScale;
        me.RemoveTempLines();
        me.CreateRealLine(cx, cy, links[lineIdx]);
        notifyAddedEvent(me.svgCanvas, me);
        me.isDrag = true;
        me.dragType = 'end';
        // me.svgCanvas.SelectedElement = me;//放在added事件中去选中该线
      });

      let linePoints = 'M' + centerPoint[0] * canvasScale + ',' + centerPoint[1] * canvasScale +
        ' L' + x * canvasScale + ',' + y * canvasScale;

      let startAxis = SvgUtility.findIntersection(this.source.GetFirstShapeElement(), linePoints);

      if (!startAxis) {
        continue;
      }

      let linePath = 'M' + startAxis[0]['x'] / canvasScale + ',' + startAxis[0]['y'] / canvasScale +
        ' L' + x + ',' + y;
      let lineAttrs = [{ attr: 'd', val: linePath }, { attr: 'fill', val: 'none' },
        { attr: 'class', val: links[i]['class'] }];
      let tempLine = SvgUtility.createSvgElement('path', lineAttrs, gElement);

      let textAttrs = [{ attr: 'x', val: 0 }, { attr: 'y', val: -10 },
        { attr: 'dx', val: x },
        { attr: 'dy', val: y },
        { attr: 'text-anchor', val: 'middle' },
        { attr: 'font-size', val: '10' }];
      let tempText = SvgUtility.createSvgElement('text', textAttrs, gElement);
      tempText.textContent = links[i]['defaultText'];
      let tempItem = { line: tempLine, text: tempText, opreateSvg: tempOperateCircle };
      this.tempLines.push(tempItem);
    }
  }

  //点击候选线时，构造真正的线
  private CreateRealLine(endX, endY, linkInfo) {
    let me = this;
    me.BusinessType = linkInfo.businessType || '';
    let bbox = this.source.GetShapeBBox();
    let elementWidth = bbox.width;
    let canvasScale = this.svgCanvas.CanvasScale;
    let centerPoint = SvgUtility.getElementCenterPoint(this.source, canvasScale);
    let linePoints = 'M' + centerPoint[0] * canvasScale + ',' + centerPoint[1] * canvasScale +
      ' L' + endX * canvasScale + ',' + endY * canvasScale;

    let startAxis = SvgUtility.findIntersection(this.source.GetFirstShapeElement(), linePoints);
    if (!startAxis) {
      return;
    }

    let linePath = 'M' + startAxis[0]['x'] / canvasScale + ',' + startAxis[0]['y'] / canvasScale +
      ' L' + endX + ',' + endY;
    let lineAttrs = [{ attr: 'd', val: linePath }, { attr: 'class', val: linkInfo['class'] }];
    let gElement = this.svgElement;
    this.lineSvg = SvgUtility.createSvgElement('path', lineAttrs, gElement);

    let zoneAttrs = [{ attr: 'd', val: linePath }, { attr: 'fill', val: 'none' },
      { attr: 'stroke', val: 'black' }, { attr: 'stroke-width', val: '15' },
      { attr: 'stroke-linecap', val: 'round' }, { attr: 'cursor', val: 'crosshair' },
      { attr: 'opacity', val: '0' }];
    this.pathZone = SvgUtility.createSvgElement('path', zoneAttrs, gElement);

    this.pathZone.addEventListener("mousedown", function() {
      me.svgCanvas.groupElement.appendChild(me.svgElement);
      me.svgCanvas.ResetHandlerPanel();
      me.svgCanvas.ResetHandlerPanel(me);
      me.svgCanvas.ElementClicked = true;
      me.svgCanvas.SelectedElement = me;
      me.svgCanvas.SelectService.ClearCollection();
      me.svgCanvas.ClearSelectRect();
      me.ShowTangentLines();
    });
    this.pathZone.addEventListener("mouseup", function() {
      me.svgCanvas.ElementClicked = false;
    });
    let middlePoint = SvgUtility.getPointOnLineByScale([startAxis[0]['x'] / canvasScale, startAxis[0]['y'] / canvasScale], [endX, endY], 0.5);
    this.operatePoints = [middlePoint, [endX, endY]];

    let textAttrs = [{ attr: 'x', val: 0 }, { attr: 'y', val: -10 },
      { attr: 'dx', val: this.operatePoints[0][0] },
      { attr: 'dy', val: this.operatePoints[0][1] },
      { attr: 'text-anchor', val: 'middle' },
      { attr: 'font-size', val: '10' }];
    this.textSvg = SvgUtility.createSvgElement('text', textAttrs, gElement);
    this.SetText(linkInfo['defaultText'], !linkInfo['showText']);

    this.svgCanvas.ResetHandlerPanel();
    this.svgCanvas.ResetHandlerPanel(this);
    this.SetOperateOffset();
    this.OperateHeight = 0;
    this.OperateScale = 0.5;
  }

  // 移除候选线
  public RemoveTempLines(removeSelf?: boolean) {
    for (let i = 0; i < this.tempLines.length; i++) {
      let tempItem = this.tempLines[i];
      this.svgElement.removeChild(tempItem['line']);
      this.svgElement.removeChild(tempItem['text']);
      this.svgElement.removeChild(tempItem['opreateSvg']);
    }
    this.tempLines = [];
    if (removeSelf) {
      this.svgCanvas.RemoveFromBaseCollection(this);
      this.svgCanvas.groupElement.removeChild(this.svgElement);
      this.svgCanvas.TempLine = null;
    }
    this.SvgCanvas.HideLineMaskSvg();
  }

  // 构造切线操作线
  private CreateTangentLine(startPoint, endPoint) {
    let linePath = 'M' + startPoint[0] + ',' + startPoint[1] + ' L' + endPoint[0] + ',' + endPoint[1];
    let lineAttrs = [{ attr: 'd', val: linePath }, { attr: 'class', val: 'tangentLine' }];
    let gElement = this.svgElement;
    return SvgUtility.createSvgElement('path', lineAttrs, gElement);
  }

  public SetText(text: String, isHide?: boolean) {
    if (isHide || text.trim().length == 0) {
      this.textSvg.setAttribute('display', 'none');
      this.text = '';
      this.textSvg.innerHTML = '';
    } else if (text.trim().length > 0) {
      this.textSvg.removeAttribute('display');
      this.text = text;
      this.textSvg.innerHTML = text.toString();
    }
  }

  public RemoveTarget() {
    if (!this.target) {
      return;
    }
    this.target = null;
  }

  get LineSvg() {
    return this.lineSvg;
  }
  get OperatePoints() {
    return this.operatePoints;
  }

  get OperateHeight() {
    return this.operateHeight;
  }

  set OperateHeight(height) {
    this.operateHeight = height;
  }

  get OperateScale() {
    return this.operateScale;
  }

  set OperateScale(scale) {
    this.operateScale = scale;
  }

  get DragType() {
    return this.dragType;
  }

  set DragType(position: string) {
    this.dragType = position;
  }

  get Target() {
    return this.target;
  }

  set Target(target: SvgElementShapeItem) {
    this.target = target;
  }

  get Source() {
    return this.source;
  }

  get PathZone() {
    return this.pathZone;
  }

  get SourceOffset() {
    return this.operateOffset;
  }

}

export class SvgElementContainerItem extends SvgElementBase {
  private translate: number[];
  private HorizontalOffset: number;
  private VerticalOffset: number;
  private width: number;
  private height: number;

  private titleRectSvg: SVGSVGElement;
  private containerRectSvg: SVGSVGElement;
  constructor(width, height, svgCanvas: SvgCanvas, id?: string) {
    // 构造容器 svgElement
    let gAttrs = { class: 'container' };
    let rectAttrs = { fill: 'none', stroke: '#03A9F4', x: 0, y: 0, width: width, height: height };
    let titleRectAttrs = {
      fill: '#D4E2FF', stroke: '#808080', x: 0, y: 0, width: width,
      height: 30, cursor: 'move', opacity: '0.5'
    };
    let textAttrs = { 'text-anchor': 'middle', x: 0, y: 20 };
    let gElement = SvgUtility.createSvgElement('g', gAttrs, svgCanvas.groupElement);
    let scalableGroup = SvgUtility.createSvgElement('g', { class: 'scalable' }, gElement);
    let rectElement = SvgUtility.createSvgElement('rect', rectAttrs, scalableGroup);
    let titleRectElement = SvgUtility.createSvgElement('rect', titleRectAttrs, gElement);
    let textElement = SvgUtility.createSvgElement('text', textAttrs, gElement) as HTMLElement;
    textElement.setAttribute('transform', 'translate(' + width / 2 + ',0)');
    textElement.innerHTML = '容器';

    let svgElement = gElement as SVGSVGElement;

    super(svgElement, svgCanvas, id);
    this.width = width;
    this.height = height;

    this.containerRectSvg = rectElement as SVGSVGElement;
    this.titleRectSvg = titleRectElement as SVGSVGElement;
    this.elementType = 'container';

    let text = '';
    this.svgElement.setAttribute('cursor', 'default');

    //元素加载事件
    this.RegisterEvent();

    svgCanvas.AddInContainerCollection(this);
  }

  // 注册事件
  public RegisterEvent() {
    this.titleRectSvg.onmousedown = (evt: MouseEvent) => { this.OnMouseDown(evt); };
    this.titleRectSvg.onmousemove = (evt: MouseEvent) => { this.OnDrag(evt); };
    this.titleRectSvg.onmouseup = (evt: MouseEvent) => { this.EndDrag(evt); };
  }

  // mousedown 事件
  public OnMouseDown(evt: MouseEvent): void {
    console.log('mouse down');
    this.svgCanvas.ResetHandlerPanel();
    this.svgCanvas.SelectedElement = this;
    this.svgCanvas.ElementClicked = true;
    this.isDrag = true;

    let svgElementRect = this.svgElement.getBoundingClientRect();
    this.HorizontalOffset = evt.clientX - svgElementRect.left;
    this.VerticalOffset = evt.clientY - svgElementRect.top;

    // 取消页面选中的元素
    this.svgCanvas.ClearSelectRect();
    this.svgCanvas.SelectService.ClearCollection();
  }
  // mousemove 事件
  public OnDrag(evt: MouseEvent): void {
    console.log('mouse move');
    if (this.isDrag) {

    }
  }
  // mouseup 事件
  public EndDrag(evt: MouseEvent): void {
    console.log('mouse up');
    this.isDrag = false;
    this.svgCanvas.ElementClicked = false;
  }

  // 设置translate
  public SetTanslate(x: number, y: number) {
    x = Number(x.toFixed(2));
    y = Number(y.toFixed(2));
    super.SetTanslate(x, y);
    this.translate = [x, y];
  }

  public AddHighlightStyle() {
    this.containerRectSvg.setAttribute('style', 'stroke:red;');
  }

  public ClearHighlightStyle() {
    this.containerRectSvg.removeAttribute('style');
  }

  get Offset() {
    return { H: this.HorizontalOffset, V: this.VerticalOffset };
  }

  //获取 Width
  get Width(): number {
    return this.width;
  }
  //设置 Width
  set Width(width: number) {
    this.width = width;
  }
  //获取 Height
  get Height(): number {
    return this.Height;
  }
  //设置 Height
  set Height(height: number) {
    this.height = height;
  }
}
