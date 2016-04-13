var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
define(["require", "exports", './SvgCanvas', './SvgUtility'], function (require, exports, SvgCanvas_1, SvgUtility_1) {
    var notifyAddedEvent;
    function registerElementAddedEvent(eventFn) {
        notifyAddedEvent = eventFn;
    }
    exports.registerElementAddedEvent = registerElementAddedEvent;
    ;
    var SvgElementBase = (function () {
        function SvgElementBase(svgElement, svgCanvas, id) {
            //图形是否选中状态
            this.isSelected = false;
            this.svgElement = svgElement;
            this.svgCanvas = svgCanvas;
            if (!id) {
                id = SvgUtility_1.default.uuid();
            }
            this.id = id;
            this.businessData = { data1: '', data2: '', data3: '', data4: '', data5: '' };
            SvgCanvas_1.SvgCanvas.CurrentCanvas.AddSvgElementBaseCollection(this);
            SvgCanvas_1.SvgCanvas.CurrentCanvas.groupElement.appendChild(svgElement);
        }
        SvgElementBase.prototype.SetTanslate = function (x, y) {
            this.svgElement.setAttribute("transform", "translate(" + x + "," + y + ")");
        };
        SvgElementBase.prototype.SetText = function (text, isHide) {
            this.text = text;
        };
        Object.defineProperty(SvgElementBase.prototype, "Id", {
            //获取元素Id
            get: function () {
                return this.id;
            },
            //设置元素Id
            set: function (id) {
                this.id = id;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(SvgElementBase.prototype, "Text", {
            //获取 Text
            get: function () {
                return this.text;
            },
            //设置 Text
            set: function (text) {
                this.text = text;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(SvgElementBase.prototype, "Width", {
            //获取 Width
            get: function () {
                return this.width;
            },
            //设置 Width
            set: function (width) {
                this.width = width;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(SvgElementBase.prototype, "Height", {
            //获取 Height
            get: function () {
                return this.Height;
            },
            //设置 Height
            set: function (height) {
                this.height = height;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(SvgElementBase.prototype, "SvgCanvas", {
            get: function () {
                return this.svgCanvas;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(SvgElementBase.prototype, "SvgElement", {
            get: function () {
                return this.svgElement;
            },
            set: function (svgElement) {
                this.svgElement = svgElement;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(SvgElementBase.prototype, "ElementType", {
            get: function () {
                return this.elementType;
            },
            set: function (elementType) {
                this.elementType = elementType;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(SvgElementBase.prototype, "BusinessType", {
            get: function () {
                return this.businessType;
            },
            set: function (type) {
                this.businessType = type;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(SvgElementBase.prototype, "BusinessData", {
            get: function () {
                return this.businessData;
            },
            set: function (data) {
                this.businessData = data;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(SvgElementBase.prototype, "IsSelected", {
            get: function () {
                return this.isSelected;
            },
            set: function (selected) {
                this.isSelected = selected;
            },
            enumerable: true,
            configurable: true
        });
        return SvgElementBase;
    })();
    exports.SvgElementBase = SvgElementBase;
    var SvgElementShapeItem = (function (_super) {
        __extends(SvgElementShapeItem, _super);
        function SvgElementShapeItem(svgElement, svgCanvas, id) {
            _super.call(this, svgElement, svgCanvas, id);
            this.clonedId = '';
            this.elementType = 'shape';
            var text = '';
            var nodes = this.svgElement.childNodes;
            for (var i = 0; i < nodes.length; i++) {
                if (nodes[i].nodeName == 'text') {
                    var text_node = nodes[i];
                    text = text_node.innerHTML.trim();
                    break;
                }
            }
            this.svgElement.setAttribute('cursor', 'default');
            //元素加载事件
            this.RegisterEvent();
        }
        // 注册事件
        SvgElementShapeItem.prototype.RegisterEvent = function () {
            var _this = this;
            this.svgElement.onmousedown = function (evt) { _this.OnMouseDown(evt); };
            this.svgElement.onmousemove = function (evt) { _this.OnDrag(evt); };
            this.svgElement.onmouseup = function (evt) { _this.EndDrag(evt); };
        };
        // mousedown 事件
        SvgElementShapeItem.prototype.OnMouseDown = function (evt) {
            this.svgCanvas.ResetHandlerPanel();
            this.svgCanvas.ElementClicked = true;
            this.svgElement.setAttribute('cursor', 'move');
            var svgElementRect = this.svgElement.getBoundingClientRect();
            this.HorizontalOffset = evt.clientX - svgElementRect.left;
            this.VerticalOffset = evt.clientY - svgElementRect.top;
            if (this.svgCanvas.ActivedLine && !this.svgCanvas.ActivedLine.LineSvg) {
                this.svgCanvas.ActivedLine.RemoveTempLines(true);
            }
            this.svgCanvas.groupElement.appendChild(this.svgElement);
            var ctrlKey = evt.ctrlKey;
            if (ctrlKey) {
                if (!this.isSelected) {
                    this.svgCanvas.SelectService.AddSelected(this);
                    this.svgCanvas.CreateSelectRect(this);
                }
                else {
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
            }
            else {
                this.svgCanvas.updateSelectedElementsOffset(this);
            }
            this.svgCanvas.ResetHandlerPanel(this);
            if (this.svgCanvas.Activedshape != this) {
                this.svgCanvas.Activedshape = this;
            }
            this.svgCanvas.SelectedElement = this;
        };
        // mousemove 事件
        SvgElementShapeItem.prototype.OnDrag = function (evt) {
            if (this.isDrag) {
                this.svgCanvas.ResetHandlerPanel();
                this.svgCanvas.ElementMoving = true;
            }
        };
        // mouseup 事件
        SvgElementShapeItem.prototype.EndDrag = function (evt) {
            this.isDrag = false;
            this.HorizontalOffset = 0;
            this.VerticalOffset = 0;
            this.svgElement.setAttribute('cursor', 'default');
            if (this.svgCanvas.Activedshape && !evt.ctrlKey) {
                this.svgCanvas.ResetHandlerPanel(this);
            }
            this.svgCanvas.ElementMoving = false;
            this.svgCanvas.ElementClicked = false;
            this.GetElementLines();
        };
        // 获取与该图形相关的线
        SvgElementShapeItem.prototype.GetElementLines = function () {
            var allElements = SvgCanvas_1.SvgCanvas.CurrentCanvas.GetSvgElementsInCanvas();
            var sourcetlines = [];
            var targetlines = [];
            for (var i = 0; i < allElements.length; i++) {
                var element = allElements[i];
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
                'sourceLines': sourcetlines,
                'targetLines': targetlines
            };
        };
        // 设置translate
        SvgElementShapeItem.prototype.SetTanslate = function (x, y) {
            x = Number(x.toFixed(2));
            y = Number(y.toFixed(2));
            _super.prototype.SetTanslate.call(this, x, y);
            this.translate = [x, y];
        };
        Object.defineProperty(SvgElementShapeItem.prototype, "Links", {
            get: function () {
                return this.links;
            },
            set: function (links) {
                this.links = links;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(SvgElementShapeItem.prototype, "Translate", {
            get: function () {
                return this.translate;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(SvgElementShapeItem.prototype, "Offset", {
            get: function () {
                return { H: this.HorizontalOffset, V: this.VerticalOffset };
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(SvgElementShapeItem.prototype, "IsDrag", {
            get: function () {
                return this.isDrag;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(SvgElementShapeItem.prototype, "ClonedId", {
            get: function () {
                return this.clonedId;
            },
            set: function (shapeId) {
                this.clonedId = shapeId;
                this.SetColor('#FFA500');
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(SvgElementShapeItem.prototype, "RelativeOffsetX", {
            get: function () {
                return this.relativeOffsetX;
            },
            set: function (x) {
                this.relativeOffsetX = x;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(SvgElementShapeItem.prototype, "RelativeOffsetY", {
            get: function () {
                return this.relativeOffsetY;
            },
            set: function (y) {
                this.relativeOffsetY = y;
            },
            enumerable: true,
            configurable: true
        });
        SvgElementShapeItem.prototype.SetText = function (text, isHide) {
            var nodes = this.svgElement.childNodes;
            for (var i = 0; i < nodes.length; i++) {
                if (nodes[i].nodeName == 'text') {
                    var textNode = nodes[i];
                    if (isHide || text.trim().length == 0) {
                        textNode.setAttribute('display', 'none');
                        this.text = '';
                        textNode.innerHTML = '';
                    }
                    else if (text.trim().length > 0) {
                        textNode.removeAttribute('display');
                        this.text = text;
                        textNode.innerHTML = text.toString();
                    }
                    break;
                }
            }
        };
        SvgElementShapeItem.prototype.SetColor = function (color) {
            var firstChild = this.svgElement.firstChild;
            firstChild.setAttribute('fill', color);
        };
        return SvgElementShapeItem;
    })(SvgElementBase);
    exports.SvgElementShapeItem = SvgElementShapeItem;
    var SvgElementLineItem = (function (_super) {
        __extends(SvgElementLineItem, _super);
        function SvgElementLineItem(svgCanvas, source, id) {
            this.source = source;
            this.elementType = 'line';
            var gElement = SvgUtility_1.default.CreateSvgElement('g', [{ 'attr': 'class', 'val': 'line' }]);
            _super.call(this, gElement, svgCanvas, id);
            if (!id) {
                this.CreateTempLines();
                if (this.svgCanvas.ActivedLine) {
                    this.svgCanvas.ActivedLine.HideTangentLines();
                }
                this.svgCanvas.ActivedLine = this;
            }
        }
        SvgElementLineItem.prototype.InitByData = function (linkInfo) {
            this.CreateRealLine(0, 0, linkInfo);
            if (this.target == this.source) {
                this.CreateSelfLine();
            }
        };
        SvgElementLineItem.prototype.UpdateLinePath = function (initByData) {
            if (this.target == this.source) {
                this.UpdateSelfLine();
                return;
            }
            var canvasScale = this.svgCanvas.CanvasScale;
            var centerPoint = SvgUtility_1.default.GetElementCenterPoint(this.source);
            var startPoint = centerPoint;
            var middlePoint = this.operatePoints[0];
            var endPoint = this.operatePoints[1];
            if (this.target) {
                // 算比例和高度的时候，需要用两个中心点算
                endPoint = SvgUtility_1.default.GetElementCenterPoint(this.target);
            }
            if (initByData || this.dragType == 'middle') {
                var data = SvgUtility_1.default.GetScaleAndHeightByMiddlePoint(startPoint, endPoint, middlePoint);
                this.operateScale = data.scale;
                this.operateHeight = data.height;
            }
            else {
                var scalePoint = SvgUtility_1.default.GetPointOnLineByScale(startPoint, endPoint, this.operateScale);
                var k = SvgUtility_1.default.GetLineSlope(startPoint, endPoint);
                var direction = middlePoint[1] - scalePoint[1];
                var tempMiddlePoint = SvgUtility_1.default.GetMiddlePointOnMove(scalePoint, -1 / k, this.operateHeight, direction);
                if (tempMiddlePoint[0] != null && !isNaN(tempMiddlePoint[0]) &&
                    tempMiddlePoint[1] != null && !isNaN(tempMiddlePoint[0])) {
                    middlePoint = tempMiddlePoint;
                    this.UpdateOperatePoints(middlePoint, null);
                }
            }
            var path = SvgUtility_1.default.BuildBezierPath(startPoint, middlePoint, endPoint, canvasScale);
            var startIntersection = SvgUtility_1.default.FindIntersection(this.source, path);
            if (startIntersection) {
                startPoint = [startIntersection[0]['x'] / canvasScale, startIntersection[0]['y'] / canvasScale];
            }
            if (this.target) {
                var endIntersection = SvgUtility_1.default.FindIntersection(this.target, path);
                if (endIntersection) {
                    endPoint = [endIntersection[0]['x'] / canvasScale, endIntersection[0]['y'] / canvasScale];
                    this.UpdateOperatePoints(null, endPoint);
                }
                else {
                    // 解决Raphael找不到交点的bug
                    console.log('not found intersection...');
                }
            }
            // 构造真正的path的时候 startPoint 与 endPoint 更改为实际的交点
            var linePath = SvgUtility_1.default.BuildBezierPath(startPoint, middlePoint, endPoint);
            this.lineSvg.setAttribute('d', linePath);
            // 解决IE 不更新line的bug
            //this.svgCanvas.svgCanvaselement.appendChild(this.svgElement);
            this.pathZone.setAttribute('d', linePath);
            this.textSvg.setAttribute('dx', middlePoint[0]);
            this.textSvg.setAttribute('dy', middlePoint[1]);
        };
        // 创建连接图形自身的线
        SvgElementLineItem.prototype.CreateSelfLine = function () {
            if (this.target != this.source) {
                return;
            }
            var x1, x2, y1, y2;
            var firstChild = this.source.SvgElement.firstChild;
            var bbox = firstChild.getBBox();
            var elementWidth = bbox.width;
            var centerPoint = SvgUtility_1.default.GetElementCenterPoint(this.source);
            x1 = centerPoint[0] - elementWidth / 2;
            x2 = centerPoint[0] + elementWidth / 2;
            y1 = centerPoint[1] - elementWidth;
            y2 = centerPoint[1] - elementWidth;
            var path = 'M ' + centerPoint[0] + ',' + centerPoint[1] + 'C' + x1 + ',' + y1 + ' ' + x2 + ',' + y2 + ' ' + centerPoint[0] + ',' + centerPoint[1];
            var startIntersection = SvgUtility_1.default.FindIntersection(this.source, path);
            if (startIntersection && startIntersection.length == 2) {
                var startPoint = startIntersection[0];
                var endPoint = startIntersection[1];
                if (startPoint['x'] > endPoint['x']) {
                    startPoint = startIntersection[1];
                    endPoint = startIntersection[0];
                }
                var linePath = 'M ' + startPoint['x'] + ',' + startPoint['y'] + 'C' + x1 + ',' + y1 + ' ' + x2 + ',' + y2 + ' ' + endPoint['x'] + ',' + endPoint['y'];
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
        };
        // 更新self line
        SvgElementLineItem.prototype.UpdateSelfLine = function () {
            var centerPoint = SvgUtility_1.default.GetElementCenterPoint(this.source);
            var path = 'M ' + centerPoint[0] + ',' + centerPoint[1] + 'C' + this.operatePoints[0][0] + ',' + this.operatePoints[0][1] + ' ' + this.operatePoints[1][0] + ',' + this.operatePoints[1][1] + ' ' + centerPoint[0] + ',' + centerPoint[1];
            var startIntersection = SvgUtility_1.default.FindIntersection(this.source, path);
            if (startIntersection && startIntersection.length == 2) {
                var startPoint = startIntersection[0];
                var endPoint = startIntersection[1];
                if (startPoint['x'] > endPoint['x']) {
                    startPoint = startIntersection[1];
                    endPoint = startIntersection[0];
                }
                var linePath = 'M ' + startPoint['x'] + ',' + startPoint['y'] + 'C' + this.operatePoints[0][0] + ',' + this.operatePoints[0][1] + ' ' + this.operatePoints[1][0] + ',' + this.operatePoints[1][1] + ' ' + endPoint['x'] + ',' + endPoint['y'];
                this.lineSvg.setAttribute('d', linePath);
                this.pathZone.setAttribute('d', linePath);
                this.textSvg.setAttribute('dx', (this.operatePoints[0][0] + this.operatePoints[1][0]) / 2);
                this.textSvg.setAttribute('dy', (this.operatePoints[0][1] + this.operatePoints[1][1]) / 2);
                var tangentLinePath1 = 'M' + startPoint['x'] + ',' + startPoint['y'] + 'L' +
                    this.operatePoints[0][0] + ',' + this.operatePoints[0][1];
                var tangentLinePath2 = 'M' + endPoint['x'] + ',' + endPoint['y'] + ' L' +
                    this.operatePoints[1][0] + ',' + this.operatePoints[1][1];
                this.tangentLines[0].setAttribute('d', tangentLinePath1);
                this.tangentLines[1].setAttribute('d', tangentLinePath2);
                if (this.dragType) {
                    this.ShowTangentLines();
                }
            }
        };
        // 构造直线
        SvgElementLineItem.prototype.CreateStraightLine = function () {
            if (!this.target) {
                return;
            }
            var canvasScale = this.svgCanvas.CanvasScale;
            var centerPoint = SvgUtility_1.default.GetElementCenterPoint(this.source);
            var targetCenterPoint = SvgUtility_1.default.GetElementCenterPoint(this.target);
            var startPoint, endPoint;
            var path = 'M' + centerPoint[0] * canvasScale + ',' + centerPoint[1] * canvasScale +
                ' L' + targetCenterPoint[0] * canvasScale + ',' + targetCenterPoint[1] * canvasScale;
            var startIntersection = SvgUtility_1.default.FindIntersection(this.source, path);
            var endIntersection = SvgUtility_1.default.FindIntersection(this.target, path);
            if (startIntersection) {
                startPoint = [startIntersection[0]['x'] / canvasScale, startIntersection[0]['y'] / canvasScale];
            }
            if (endIntersection) {
                endPoint = [endIntersection[0]['x'] / canvasScale, endIntersection[0]['y'] / canvasScale];
            }
            if (startPoint && endPoint) {
                var middlePoint = [(startPoint[0] + endPoint[0]) / 2, (startPoint[1] + endPoint[1]) / 2];
                this.UpdateOperatePoints(middlePoint, endPoint);
                var linePath = 'M' + startPoint[0] + ',' + startPoint[1] + ' L' + endPoint[0] + ',' + endPoint[1];
                this.lineSvg.setAttribute('d', linePath);
                this.pathZone.setAttribute('d', linePath);
                this.textSvg.setAttribute('dx', middlePoint[0]);
                this.textSvg.setAttribute('dy', middlePoint[1]);
                this.svgCanvas.ResetHandlerPanel();
            }
        };
        // 更新操作点
        SvgElementLineItem.prototype.UpdateOperatePoints = function (middlePoint, endPoint) {
            if (middlePoint) {
                this.operatePoints[0][0] = parseFloat(middlePoint[0].toFixed(2));
                this.operatePoints[0][1] = parseFloat(middlePoint[1].toFixed(2));
            }
            if (endPoint) {
                this.operatePoints[1][0] = parseFloat(endPoint[0].toFixed(2));
                this.operatePoints[1][1] = parseFloat(endPoint[1].toFixed(2));
            }
        };
        // 设置操作点局中心的偏移量
        SvgElementLineItem.prototype.SetOperateOffset = function () {
            var centerPoints = SvgUtility_1.default.GetElementCenterPoint(this.source);
            this.operateOffset = [
                [this.operatePoints[0][0] - centerPoints[0],
                    this.operatePoints[0][1] - centerPoints[1]],
                [this.operatePoints[1][0] - centerPoints[0],
                    this.operatePoints[1][1] - centerPoints[1]]
            ];
        };
        // 隐藏切线操作线
        SvgElementLineItem.prototype.HideTangentLines = function () {
            if (this.tangentLines && this.tangentLines.length > 0) {
                this.tangentLines[0].setAttribute('display', 'none');
                this.tangentLines[1].setAttribute('display', 'none');
            }
        };
        // 显示切线操作线
        SvgElementLineItem.prototype.ShowTangentLines = function () {
            if (this.tangentLines && this.tangentLines.length > 0) {
                this.tangentLines[0].setAttribute('display', 'block');
                this.tangentLines[1].setAttribute('display', 'block');
            }
        };
        // 创建候选线
        SvgElementLineItem.prototype.CreateTempLines = function () {
            if (!this.source || !this.source.Links) {
                return;
            }
            var svgCanvasRect = this.svgCanvas.svgCanvasElement.getBoundingClientRect();
            this.tempLines = [];
            var angle = Math.PI / 6;
            var links = this.source.Links;
            var gElement = this.svgElement;
            var firstChild = this.source.SvgElement.firstChild;
            var bbox = firstChild.getBBox();
            var elementWidth = bbox.width;
            var centerPoint = SvgUtility_1.default.GetElementCenterPoint(this.source);
            var oddCount = links.length % 2 == 0;
            var tempAngle = 0;
            if (oddCount) {
                tempAngle = angle / 2;
            }
            var tempLineLen = elementWidth + 20;
            var me = this;
            var canvasScale = this.svgCanvas.CanvasScale;
            for (var i = 0; i < links.length; i++) {
                var k = 1;
                if ((i + 1) % 2 == 0) {
                    k = -1;
                }
                var itemAngle = k * (i + i % 2) / 2 * angle + tempAngle;
                var h = tempLineLen * Math.sin(itemAngle);
                var w = tempLineLen * Math.cos(itemAngle);
                var x = centerPoint[0] + w;
                var y = centerPoint[1] - h;
                var circleAttrs = [{ attr: 'cx', val: x }, { attr: 'cy', val: y },
                    { attr: 'r', val: 5 }, { attr: 'class', val: 'lineOperator' },
                    { attr: 'lineIdx', val: i }];
                var tempOperateCircle = SvgUtility_1.default.CreateSvgElement('circle', circleAttrs, gElement);
                tempOperateCircle.addEventListener('mousedown', function (evt) {
                    var lineIdx = this.getAttribute('lineIdx');
                    var cx = (evt['clientX'] - svgCanvasRect.left) / me.svgCanvas.CanvasScale;
                    var cy = (evt['clientY'] - svgCanvasRect.top) / me.svgCanvas.CanvasScale;
                    me.RemoveTempLines();
                    me.CreateRealLine(cx, cy, links[lineIdx]);
                    me.isDrag = true;
                    me.dragType = 'end';
                    // me.svgCanvas.SelectedElement = me;//放在added事件中去选中该线
                });
                var linePoints = 'M' + centerPoint[0] * canvasScale + ',' + centerPoint[1] * canvasScale +
                    ' L' + x * canvasScale + ',' + y * canvasScale;
                var startAxis = SvgUtility_1.default.FindIntersection(this.source, linePoints);
                if (!startAxis) {
                    continue;
                }
                var linePath = 'M' + startAxis[0]['x'] / canvasScale + ',' + startAxis[0]['y'] / canvasScale +
                    ' L' + x + ',' + y;
                var lineAttrs = [{ attr: 'd', val: linePath }, { attr: 'fill', val: 'none' },
                    { attr: 'class', val: links[i]['class'] }];
                var tempLine = SvgUtility_1.default.CreateSvgElement('path', lineAttrs, gElement);
                var textAttrs = [{ attr: 'x', val: 0 }, { attr: 'y', val: -10 },
                    { attr: 'dx', val: x },
                    { attr: 'dy', val: y },
                    { attr: 'text-anchor', val: 'middle' },
                    { attr: 'font-size', val: '10' }];
                var tempText = SvgUtility_1.default.CreateSvgElement('text', textAttrs, gElement);
                tempText.textContent = links[i]['defaultText'];
                var tempItem = { line: tempLine, text: tempText, opreateSvg: tempOperateCircle };
                this.tempLines.push(tempItem);
            }
        };
        //点击候选线时，构造真正的线
        SvgElementLineItem.prototype.CreateRealLine = function (endX, endY, linkInfo) {
            var me = this;
            me.BusinessType = linkInfo.businessType || '';
            var firstChild = this.source.SvgElement.firstChild;
            var bbox = firstChild.getBBox();
            var elementWidth = bbox.width;
            var centerPoint = SvgUtility_1.default.GetElementCenterPoint(this.source);
            var canvasScale = this.svgCanvas.CanvasScale;
            var linePoints = 'M' + centerPoint[0] * canvasScale + ',' + centerPoint[1] * canvasScale +
                ' L' + endX * canvasScale + ',' + endY * canvasScale;
            var startAxis = SvgUtility_1.default.FindIntersection(this.source, linePoints);
            if (!startAxis) {
                return;
            }
            var linePath = 'M' + startAxis[0]['x'] / canvasScale + ',' + startAxis[0]['y'] / canvasScale +
                ' L' + endX + ',' + endY;
            var lineAttrs = [{ attr: 'd', val: linePath }, { attr: 'class', val: linkInfo['class'] }];
            var gElement = this.svgElement;
            this.lineSvg = SvgUtility_1.default.CreateSvgElement('path', lineAttrs, gElement);
            var zoneAttrs = [{ attr: 'd', val: linePath }, { attr: 'fill', val: 'none' },
                { attr: 'stroke', val: 'black' }, { attr: 'stroke-width', val: '15' },
                { attr: 'stroke-linecap', val: 'round' }, { attr: 'cursor', val: 'crosshair' },
                { attr: 'opacity', val: '0' }];
            this.pathZone = SvgUtility_1.default.CreateSvgElement('path', zoneAttrs, gElement);
            this.pathZone.addEventListener("mousedown", function () {
                me.svgCanvas.groupElement.appendChild(me.svgElement);
                me.svgCanvas.ResetHandlerPanel();
                me.svgCanvas.ResetHandlerPanel(me);
                if (me.svgCanvas.ActivedLine) {
                    me.svgCanvas.ActivedLine.HideTangentLines();
                }
                me.svgCanvas.ActivedLine = me;
                me.svgCanvas.Activedshape = me.source;
                me.svgCanvas.ElementClicked = true;
                me.svgCanvas.SelectedElement = me;
                me.ShowTangentLines();
            });
            this.pathZone.addEventListener("mouseup", function () {
                me.svgCanvas.ElementClicked = false;
            });
            var middlePoint = SvgUtility_1.default.GetPointOnLineByScale([startAxis[0]['x'] / canvasScale, startAxis[0]['y'] / canvasScale], [endX, endY], 0.5);
            this.operatePoints = [middlePoint, [endX, endY]];
            var textAttrs = [{ attr: 'x', val: 0 }, { attr: 'y', val: -10 },
                { attr: 'dx', val: this.operatePoints[0][0] },
                { attr: 'dy', val: this.operatePoints[0][1] },
                { attr: 'text-anchor', val: 'middle' },
                { attr: 'font-size', val: '10' }];
            this.textSvg = SvgUtility_1.default.CreateSvgElement('text', textAttrs, gElement);
            this.SetText(linkInfo['defaultText'], !linkInfo['showText']);
            this.svgCanvas.ResetHandlerPanel();
            this.svgCanvas.ResetHandlerPanel(this);
            this.svgCanvas.ActivedLine = this;
            this.SetOperateOffset();
            this.OperateHeight = 0;
            this.OperateScale = 0.5;
            notifyAddedEvent(this.svgCanvas, this);
        };
        // 移除候选线
        SvgElementLineItem.prototype.RemoveTempLines = function (removeSelf) {
            for (var i = 0; i < this.tempLines.length; i++) {
                var tempItem = this.tempLines[i];
                this.svgElement.removeChild(tempItem['line']);
                this.svgElement.removeChild(tempItem['text']);
                this.svgElement.removeChild(tempItem['opreateSvg']);
            }
            this.tempLines = [];
            if (removeSelf) {
                this.svgCanvas.RemoveFromBaseCollection(this);
                this.svgCanvas.groupElement.removeChild(this.svgElement);
                this.svgCanvas.ActivedLine = null;
            }
            this.SvgCanvas.HideLineMaskSvg();
        };
        // 构造切线操作线
        SvgElementLineItem.prototype.CreateTangentLine = function (startPoint, endPoint) {
            var linePath = 'M' + startPoint[0] + ',' + startPoint[1] + ' L' + endPoint[0] + ',' + endPoint[1];
            var lineAttrs = [{ attr: 'd', val: linePath }, { attr: 'class', val: 'tangentLine' }];
            var gElement = this.svgElement;
            return SvgUtility_1.default.CreateSvgElement('path', lineAttrs, gElement);
        };
        SvgElementLineItem.prototype.SetText = function (text, isHide) {
            if (isHide || text.trim().length == 0) {
                this.textSvg.setAttribute('display', 'none');
                this.text = '';
                this.textSvg.innerHTML = '';
            }
            else if (text.trim().length > 0) {
                this.textSvg.removeAttribute('display');
                this.text = text;
                this.textSvg.innerHTML = text.toString();
            }
        };
        SvgElementLineItem.prototype.RemoveTarget = function () {
            if (!this.target) {
                return;
            }
            this.target = null;
        };
        Object.defineProperty(SvgElementLineItem.prototype, "LineSvg", {
            get: function () {
                return this.lineSvg;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(SvgElementLineItem.prototype, "OperatePoints", {
            get: function () {
                return this.operatePoints;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(SvgElementLineItem.prototype, "OperateHeight", {
            get: function () {
                return this.operateHeight;
            },
            set: function (height) {
                this.operateHeight = height;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(SvgElementLineItem.prototype, "OperateScale", {
            get: function () {
                return this.operateScale;
            },
            set: function (scale) {
                this.operateScale = scale;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(SvgElementLineItem.prototype, "DragType", {
            get: function () {
                return this.dragType;
            },
            set: function (position) {
                this.dragType = position;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(SvgElementLineItem.prototype, "IsDrag", {
            get: function () {
                return this.isDrag;
            },
            set: function (isDrag) {
                this.isDrag = isDrag;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(SvgElementLineItem.prototype, "Target", {
            get: function () {
                return this.target;
            },
            set: function (target) {
                this.target = target;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(SvgElementLineItem.prototype, "Source", {
            get: function () {
                return this.source;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(SvgElementLineItem.prototype, "PathZone", {
            get: function () {
                return this.pathZone;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(SvgElementLineItem.prototype, "SourceOffset", {
            get: function () {
                return this.operateOffset;
            },
            enumerable: true,
            configurable: true
        });
        return SvgElementLineItem;
    })(SvgElementBase);
    exports.SvgElementLineItem = SvgElementLineItem;
});
