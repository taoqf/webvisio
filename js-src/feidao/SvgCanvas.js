define(["require", "exports", './SvgElement', './SvgElement', './SvgUtility'], function (require, exports, SvgElement_1, SvgElement_2, SvgUtility_1) {
    var Rect = (function () {
        function Rect(point, width, height) {
            this.startPoint = point;
            this.width = width;
            this.height = height;
        }
        Object.defineProperty(Rect.prototype, "StartPoint", {
            get: function () {
                return this.startPoint;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Rect.prototype, "Width", {
            get: function () {
                return this.width;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Rect.prototype, "Heigth", {
            get: function () {
                return this.width;
            },
            enumerable: true,
            configurable: true
        });
        return Rect;
    })();
    exports.Rect = Rect;
    var Point = (function () {
        function Point(x, y) {
            this.x = x;
            this.y = y;
        }
        Object.defineProperty(Point.prototype, "X", {
            get: function () {
                return this.x;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Point.prototype, "Y", {
            get: function () {
                return this.y;
            },
            enumerable: true,
            configurable: true
        });
        return Point;
    })();
    exports.Point = Point;
    var SelectService = (function () {
        function SelectService() {
            this.ISelectableCollection = [];
        }
        //设置所选的项
        SelectService.prototype.SetSelected = function (able) {
            if (this.ISelectableCollection.length != 0) {
                this.ClearCollection();
            }
            able.isSelected = true;
            this.ISelectableCollection.push(able);
        };
        //获取所选的集合
        SelectService.prototype.GetSelectableCollection = function () {
            return this.ISelectableCollection;
        };
        // 清空集合
        SelectService.prototype.ClearCollection = function () {
            var len = this.ISelectableCollection.length;
            for (var i = 0; i < len; i++) {
                var item = this.ISelectableCollection[i];
                item.isSelected = false;
            }
            this.ISelectableCollection = [];
        };
        // 加入选中结合
        SelectService.prototype.AddSelected = function (able) {
            able.isSelected = true;
            this.ISelectableCollection.push(able);
        };
        // 移除选中集合
        SelectService.prototype.ReomveSelected = function (able) {
            var len = this.ISelectableCollection.length;
            for (var i = 0; i < len; i++) {
                var item = this.ISelectableCollection[i];
                if (item == able) {
                    able.isSelected = false;
                    this.ISelectableCollection.splice(i, 1);
                    break;
                }
            }
        };
        // 判断是否包含元素
        SelectService.prototype.HasSelectedItem = function (able) {
            var len = this.ISelectableCollection.length;
            for (var i = 0; i < len; i++) {
                var item = this.ISelectableCollection[i];
                if (item == able) {
                    return true;
                }
            }
            return false;
        };
        return SelectService;
    })();
    exports.SelectService = SelectService;
    var SvgCanvas = (function () {
        //构造函数
        function SvgCanvas(element, width, height, id) {
            var _this = this;
            this.svgElementBaseCollection = [];
            this.selectService = null;
            //元素是否按下左键
            this.SvgCanvasElementMouseLeft = false;
            this.elementMoving = false;
            this.elementClicked = false;
            this.canvasScale = 1;
            this.selectRectSvgs = [];
            this.svgCanvasElement = element;
            SvgCanvas.CurrentCanvas = this;
            this.SvgCanvasWidth = width;
            this.SvgCanvasHeight = height;
            this.canvasWidth = width;
            this.canvasHeight = height;
            this.canvasMinWidth = width;
            this.canvasMinHeight = height;
            this.selectService = new SelectService();
            this.groupElement = SvgUtility_1.default.CreateSvgElement('g', [], this.svgCanvasElement);
            this.svgCanvasElement.onmousedown = function (evt) { _this.Onmousedown(evt); };
            this.svgCanvasElement.onmousemove = function (evt) { _this.OnMousemove(evt); };
            this.svgCanvasElement.onmouseup = function (evt) { _this.OnMouseup(evt); };
            this.CreateHandlerElement();
            if (!id) {
                this.id = SvgUtility_1.default.uuid();
            }
            else {
                this.id = id;
            }
        }
        // 外抛事件
        // 连接之前事件
        SvgCanvas.prototype.onBeforeConnectElement = function (line, target) {
            if (this.beforeConnectEvent) {
                this.beforeConnectEvent(this, line, target);
            }
        };
        // 连接之后事件
        SvgCanvas.prototype.onConnectedElement = function (line, target) {
            if (this.elementConnectedEvent) {
                this.elementConnectedEvent(this, line, target);
            }
        };
        // 元素选中之后事件
        SvgCanvas.prototype.onElementSelected = function (element) {
            if (this.elementSelectedEvent) {
                this.elementSelectedEvent(this, element);
            }
        };
        // 元素删除之后事件
        SvgCanvas.prototype.onElementDeleted = function () {
            if (this.elementDeletedEvent) {
                this.elementDeletedEvent(this);
            }
        };
        // 元素删除之后事件
        SvgCanvas.prototype.onCancelSelect = function () {
            if (this.cancelSelectEvent) {
                this.cancelSelectEvent();
            }
        };
        // 元素克隆之后事件
        SvgCanvas.prototype.onElementCloned = function (element) {
            if (this.elementClonedEvent) {
                this.elementClonedEvent(this, element);
            }
        };
        // 断开连接前事件
        SvgCanvas.prototype.onBeforeBreakConnetion = function (line) {
            if (this.beforeBreakConnectionEvent) {
                this.beforeBreakConnectionEvent(this, line, line.Target);
            }
        };
        SvgCanvas.prototype.Onmousedown = function (evt) {
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
            }
        };
        SvgCanvas.prototype.OnMousemove = function (evt) {
            var svgCanvasRect = this.svgCanvasElement.getBoundingClientRect();
            if (this.activedShape && this.elementMoving) {
                var firstChild = this.activedShape.SvgElement.firstChild;
                var bbox = firstChild.getBBox();
                var x = (evt.clientX - svgCanvasRect.left - this.activedShape.Offset.H || 0 - bbox.x) / this.canvasScale;
                var y = (evt.clientY - svgCanvasRect.top - this.activedShape.Offset.V || 0 - bbox.y) / this.canvasScale;
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
                var cx = (evt.clientX - svgCanvasRect.left) / this.canvasScale;
                var cy = (evt.clientY - svgCanvasRect.top) / this.canvasScale;
                // update line operate points
                if (this.ActivedLine.DragType == 'middle') {
                    this.lineMidOperateSvg.setAttribute('cx', cx.toString());
                    this.lineMidOperateSvg.setAttribute('cy', cy.toString());
                    this.lineEndOperateSvg.setAttribute('cx', this.ActivedLine.OperatePoints[1][0].toString());
                    this.lineEndOperateSvg.setAttribute('cy', this.ActivedLine.OperatePoints[1][1].toString());
                    this.ActivedLine.UpdateOperatePoints([cx, cy], null);
                }
                else {
                    this.lineEndOperateSvg.setAttribute('cx', cx.toString());
                    this.lineEndOperateSvg.setAttribute('cy', cy.toString());
                    this.lineMidOperateSvg.setAttribute('cx', this.ActivedLine.OperatePoints[0][0].toString());
                    this.lineMidOperateSvg.setAttribute('cy', this.ActivedLine.OperatePoints[0][1].toString());
                    if (this.ActivedLine.Target == null || this.ActivedLine.Target == this.ActivedLine.Source) {
                        this.ActivedLine.UpdateOperatePoints(null, [cx, cy]);
                    }
                    else if (Math.abs(this.ActivedLine.OperatePoints[1][0] - cx) > 10 ||
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
                    var centerPoint = SvgUtility_1.default.GetElementCenterPoint(this.activedShape);
                    var operatePoints = this.ActivedLine.OperatePoints;
                    var path = SvgUtility_1.default.BuildBezierPath(centerPoint, operatePoints[0], operatePoints[1], this.canvasScale);
                    var shapes = this.GetSvgElementsInCanvas();
                    this.targetShape = null;
                    for (var i = 0; i < shapes.length; i++) {
                        var shapeItem = shapes[i];
                        if (shapeItem.ElementType != 'shape') {
                            continue;
                        }
                        else if (shapeItem == this.activedShape) {
                            var shapeNode = shapeItem.SvgElement.firstChild;
                            shapeNode.removeAttribute('style');
                            var intersections = SvgUtility_1.default.FindIntersection(shapeItem, path);
                            if (intersections && intersections.length == 2) {
                                var shapeNode_1 = shapeItem.SvgElement.firstChild;
                                shapeNode_1.style.stroke = 'red';
                                this.targetShape = shapeItem;
                                break;
                            }
                        }
                        else {
                            var intersections = SvgUtility_1.default.FindIntersection(shapeItem, path);
                            if (intersections && intersections.length == 1) {
                                var shapeNode = shapeItem.SvgElement.firstChild;
                                shapeNode.style.stroke = 'red';
                                this.targetShape = shapeItem;
                                break;
                            }
                            else {
                                var shapeNode = shapeItem.SvgElement.firstChild;
                                shapeNode.removeAttribute('style');
                            }
                        }
                    }
                }
            }
        };
        SvgCanvas.prototype.OnMouseup = function (evt) {
            this.svgCanvasElement.deselectAll();
            if (this.ActivedLine && this.ActivedLine.LineSvg) {
                this.ActivedLine.IsDrag = false;
                this.ActivedLine.SetOperateOffset();
                if (this.targetShape) {
                    this.onBeforeConnectElement(this.ActivedLine, this.targetShape);
                    this.targetShape = null;
                }
            }
        };
        // 构造页面辅助操作元素
        SvgCanvas.prototype.CreateHandlerElement = function () {
            var me = this;
            var maskAttrs = [{ attr: 'display', val: 'none' }, { attr: 'fill', val: 'black' },
                { attr: 'opacity', val: '0.6' }, { attr: 'x', val: '0' }, { attr: 'y', val: '0' },
                { attr: 'width', val: this.SvgCanvasWidth }, { attr: 'height', val: this.SvgCanvasHeight }];
            this.svgMaskSvg = SvgUtility_1.default.CreateSvgElement('rect', maskAttrs, this.groupElement);
            this.svgMaskSvg.addEventListener('click', function (e) {
                me.HideLineMaskSvg();
                me.ActivedLine.RemoveTempLines(true);
            });
            var polygonAttrs = [{ attr: 'points', val: '0,0 10,8 0,15' }, { attr: 'fill', val: 'black' },
                { attr: 'display', val: 'none' }, { attr: 'stroke', val: 'stroke' }, { attr: 'cursor', val: 'default' }];
            this.elementOperateSvg = SvgUtility_1.default.CreateSvgElement('polygon', polygonAttrs, this.groupElement);
            this.elementOperateSvg.addEventListener("mousedown", function () {
                this.setAttribute("display", "none");
                me.ShowLineMaskSvg();
                me.groupElement.appendChild(me.Activedshape.SvgElement);
                me.CreateLineElement();
                me.elementClicked = true;
            });
            this.elementOperateSvg.addEventListener("mouseup", function () {
                me.elementClicked = false;
            });
            var circleAttrs = [{ attr: 'r', val: '6' }, { attr: 'cx', val: '0' },
                { attr: 'cy', val: '0' }, { attr: 'display', val: 'none' },
                { attr: 'class', val: 'lineOperator' }];
            this.lineMidOperateSvg = SvgUtility_1.default.CreateSvgElement('circle', circleAttrs, this.groupElement);
            this.lineMaskOperateSvg = SvgUtility_1.default.CreateSvgElement('circle', circleAttrs, this.groupElement);
            this.lineMaskOperateSvg.setAttribute('class', 'lineMask');
            this.lineMidOperateSvg.addEventListener("mousedown", function () {
                me.ActivedLine.IsDrag = true;
                me.ActivedLine.DragType = 'middle';
                me.elementClicked = true;
                me.selectedElement = me.activedLine;
            });
            this.lineMidOperateSvg.addEventListener("mouseup", function () {
                me.ActivedLine.IsDrag = false;
                me.elementClicked = false;
            });
            this.lineEndOperateSvg = SvgUtility_1.default.CreateSvgElement('circle', circleAttrs, this.groupElement);
            this.lineEndOperateSvg.addEventListener("mousedown", function () {
                me.ActivedLine.IsDrag = true;
                me.ActivedLine.DragType = 'end';
                me.elementClicked = true;
                me.selectedElement = me.activedLine;
            });
            this.lineEndOperateSvg.addEventListener("mouseup", function () {
                me.ActivedLine.IsDrag = false;
                me.elementClicked = false;
            });
        };
        // 更新element中的数据
        SvgCanvas.prototype.UpdateElementData = function (id, dataNo, data) {
            var element = this.GetSvgElementById(id);
            var dataKey = 'data' + dataNo;
            var originData = element.BusinessData;
            originData[dataKey] = data;
        };
        // 更新element 的文本
        SvgCanvas.prototype.UpdateElementText = function (id, text) {
            var element = this.GetSvgElementById(id);
            element.SetText(text);
        };
        // 连接指定的元素
        SvgCanvas.prototype.ConnectElements = function (targetId, lineId) {
            var targetShape = this.GetSvgElementById(targetId);
            var line = this.GetSvgElementById(lineId);
            if (targetShape) {
                line.Target = targetShape;
                var shapeNode = targetShape.SvgElement.firstChild;
                shapeNode.removeAttribute('style');
                if (line.Target != line.Source) {
                    line.UpdateLinePath();
                    this.lineMidOperateSvg.setAttribute('cx', this.ActivedLine.OperatePoints[0][0].toString());
                    this.lineMidOperateSvg.setAttribute('cy', this.ActivedLine.OperatePoints[0][1].toString());
                    this.lineEndOperateSvg.setAttribute('cx', this.ActivedLine.OperatePoints[1][0].toString());
                    this.lineEndOperateSvg.setAttribute('cy', this.ActivedLine.OperatePoints[1][1].toString());
                }
                else {
                    line.CreateSelfLine();
                    this.lineMidOperateSvg.setAttribute('cx', this.ActivedLine.OperatePoints[0][0].toString());
                    this.lineMidOperateSvg.setAttribute('cy', this.ActivedLine.OperatePoints[0][1].toString());
                    this.lineEndOperateSvg.setAttribute('cx', this.ActivedLine.OperatePoints[1][0].toString());
                    this.lineEndOperateSvg.setAttribute('cy', this.ActivedLine.OperatePoints[1][1].toString());
                }
                this.onConnectedElement(this.ActivedLine, targetShape);
            }
        };
        // 通过Id批量移除元素
        SvgCanvas.prototype.RemoveElementsByIds = function (elementIds) {
            for (var i = 0; i < elementIds.length; i++) {
                this.RemoveElementById(elementIds[i]);
            }
            this.onElementDeleted();
        };
        // 批量移除元素
        SvgCanvas.prototype.RemoveElements = function (delElements) {
            for (var i = 0; i < delElements.length; i++) {
                var delElement = delElements[i];
                if (delElement) {
                    this.RemoveElement(delElement);
                }
            }
            this.onElementDeleted();
        };
        // 通过Id删除画面上的元素
        SvgCanvas.prototype.RemoveElementById = function (elementId) {
            var delElement = this.GetSvgElementById(elementId);
            if (delElement) {
                this.RemoveElement(delElement);
            }
        };
        // 删除画面上的元素
        SvgCanvas.prototype.RemoveElement = function (delElement) {
            if (delElement) {
                if (delElement.ElementType == 'shape') {
                    var element = delElement;
                    var lines = element.GetElementLines();
                    var sourceLines = lines.sourceLines;
                    var targetLines = lines.targetLines;
                    this.RemoveLines(sourceLines);
                    for (var i = 0; i < targetLines.length; i++) {
                        var line = targetLines[i];
                        line.Target = null;
                    }
                    this.RemoveFromBaseCollection(element);
                    this.groupElement.removeChild(element.SvgElement);
                    this.ReomveSelectRect(element);
                }
                else {
                    this.RemoveLines([delElement]);
                }
                this.ResetHandlerPanel();
            }
        };
        // 删除线元素
        SvgCanvas.prototype.RemoveLines = function (lines) {
            for (var i = 0; i < lines.length; i++) {
                var line = lines[i];
                this.RemoveFromBaseCollection(line);
                this.groupElement.removeChild(line.SvgElement);
            }
        };
        // 从缓存集合中删除指定的元素
        SvgCanvas.prototype.RemoveFromBaseCollection = function (element) {
            for (var j = 0; j < this.svgElementBaseCollection.length; j++) {
                var item = this.svgElementBaseCollection[j];
                if (element == item) {
                    this.svgElementBaseCollection.splice(j, 1);
                    break;
                }
            }
        };
        //移动shape元素的时候，重新计算线的位置
        SvgCanvas.prototype.MoveLines = function (shape) {
            var shapeLines = shape.GetElementLines();
            var sourceLines = shapeLines['sourceLines'];
            var targetLines = shapeLines['targetLines'];
            if (sourceLines.length > 0) {
                for (var i = 0; i < sourceLines.length; i++) {
                    var lineItem = sourceLines[i];
                    if (!lineItem.Target && lineItem.LineSvg ||
                        lineItem.Target == lineItem.Source) {
                        lineItem.DragType = null;
                        this.ResetSingleLine(lineItem);
                    }
                    else {
                        lineItem.DragType = 'end';
                        lineItem.UpdateLinePath();
                    }
                }
            }
            if (targetLines.length > 0) {
                for (var i = 0; i < targetLines.length; i++) {
                    var lineItem = targetLines[i];
                    lineItem.DragType = 'end';
                    lineItem.UpdateLinePath();
                }
            }
        };
        // 拖动shape时，重置该shape上单线的位置
        SvgCanvas.prototype.ResetSingleLine = function (line) {
            var sourceElement = line.Source.SvgElement;
            var sourceCenter = SvgUtility_1.default.GetElementCenterPoint(line.Source);
            var points = [[
                    sourceCenter[0] + line.SourceOffset[0][0],
                    sourceCenter[1] + line.SourceOffset[0][1]
                ], [
                    sourceCenter[0] + line.SourceOffset[1][0],
                    sourceCenter[1] + line.SourceOffset[1][1]
                ]];
            line.UpdateOperatePoints(points[0], points[1]);
            line.UpdateLinePath();
        };
        // 扩展或者裁剪canvas 线元素的边界计算不准确
        SvgCanvas.prototype.PaperFitToContent = function (element) {
            if (!element) {
                return;
            }
            var extendW = 500;
            var extendH = 500;
            var extended = false;
            var curtailed = false;
            var ctm = element.SvgElement.getCTM();
            var bbox = element.SvgElement.getBBox();
            var offsetX = ctm.e;
            var offsetY = ctm.f;
            var width = bbox.width;
            var height = bbox.height;
            var maxOffsetX, maxOffsetY;
            if (element.ElementType == 'line') {
                offsetX = bbox.x;
                offsetY = bbox.y;
                maxOffsetX = width + offsetX;
                maxOffsetY = height + offsetY;
            }
            else {
                maxOffsetX = width + offsetX / this.canvasScale;
                maxOffsetY = height + offsetY / this.canvasScale;
                var shapeItem = element;
                var lineData = shapeItem.GetElementLines();
                if (lineData['sourceLines'].length > 0 || lineData['targetLines'].length > 0) {
                    var lines = lineData['sourceLines'].concat(lineData['targetLines']);
                    var maxOffset = this.GetMaxOffsetInElements(lines);
                    var maxLeft = maxOffset.maxLeft;
                    var maxTop = maxOffset.maxTop;
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
                var count = this.svgElementBaseCollection.length;
                var maxOffset = this.GetMaxOffsetInElements(this.svgElementBaseCollection);
                var maxLeft = maxOffset.maxLeft;
                var maxTop = maxOffset.maxTop;
                if (this.canvasWidth - extendW > maxLeft) {
                    if (this.canvasWidth - extendW <= this.canvasMinWidth) {
                        this.canvasWidth = this.canvasMinWidth;
                    }
                    else {
                        this.canvasWidth -= extendW;
                    }
                    curtailed = true;
                }
                if (this.canvasHeight - extendH > maxTop) {
                    if (this.canvasHeight - extendH <= this.canvasMinHeight) {
                        this.canvasHeight = this.canvasMinHeight;
                    }
                    else {
                        this.canvasHeight -= extendH;
                    }
                    curtailed = true;
                }
            }
            if (extended || curtailed) {
                this.ScaleCanvas(this.canvasScale);
            }
        };
        // 根据选择框的范围，选中页面元素
        SvgCanvas.prototype.SelectElementsByRegion = function (min_x, min_y, max_x, max_y) {
            min_x = min_x / this.canvasScale;
            min_y = min_y / this.canvasScale;
            max_x = max_x / this.canvasScale;
            max_y = max_y / this.canvasScale;
            var allElements = this.svgElementBaseCollection;
            for (var i = 0, len = allElements.length; i < len; i++) {
                if (allElements[i].ElementType == 'shape') {
                    var shapeElement = allElements[i];
                    var translate = shapeElement.Translate;
                    var bbox = shapeElement.SvgElement.getBBox();
                    if (translate[0] + bbox.x > min_x && translate[1] + bbox.y > min_y) {
                        var shapeMaxX = translate[0] + bbox.x + bbox.width;
                        var shapeMaxY = translate[1] + bbox.y + bbox.height;
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
        };
        // 构造选中框
        SvgCanvas.prototype.CreateSelectRect = function (shape) {
            var bbox = shape.SvgElement.getBBox();
            var width = bbox.width + 4;
            var height = bbox.height + 4;
            var translate = shape.Translate;
            var offsetX = translate[0] + bbox.x - 2;
            var offsetY = translate[1] + bbox.y - 2;
            var rectAttrs = { class: 'selection-box', dataId: shape.Id, x: offsetX, y: offsetY, width: width, height: height };
            var rectSvg = SvgUtility_1.default.CreateSvgElement('rect', rectAttrs, this.groupElement);
            this.selectRectSvgs.push(rectSvg);
        };
        // 移除选中框
        SvgCanvas.prototype.ReomveSelectRect = function (shape) {
            var len = this.selectRectSvgs.length;
            for (var i = 0; i < len; i++) {
                var rectSvg = this.selectRectSvgs[i];
                var dataId = rectSvg.getAttribute('dataId');
                if (dataId == shape.Id) {
                    this.groupElement.removeChild(rectSvg);
                    this.selectRectSvgs.splice(i, 1);
                    break;
                }
            }
        };
        // 更新选中框的位置
        SvgCanvas.prototype.UpdateSelectRect = function (shape) {
            var len = this.selectRectSvgs.length;
            for (var i = 0; i < len; i++) {
                var rectSvg = this.selectRectSvgs[i];
                var dataId = rectSvg.getAttribute('dataId');
                if (dataId == shape.Id) {
                    var bbox = shape.SvgElement.getBBox();
                    var translate = shape.Translate;
                    var offsetX = translate[0] + bbox.x - 2;
                    var offsetY = translate[1] + bbox.y - 2;
                    rectSvg.setAttribute('x', offsetX.toFixed(2));
                    rectSvg.setAttribute('y', offsetY.toFixed(2));
                    break;
                }
            }
        };
        // 清除所有的选择框
        SvgCanvas.prototype.ClearSelectRect = function () {
            var len = this.selectRectSvgs.length;
            for (var i = 0; i < len; i++) {
                var rectSvg = this.selectRectSvgs[i];
                this.groupElement.removeChild(rectSvg);
            }
            this.selectRectSvgs = [];
        };
        // 获取页面元素中距左和上的最大边界值
        SvgCanvas.prototype.GetMaxOffsetInElements = function (elements) {
            var maxLeft = 0;
            var maxTop = 0;
            var count = elements.length;
            for (var i = 0; i < count; i++) {
                var item = elements[i];
                var ctm = item.SvgElement.getCTM();
                var bbox = item.SvgElement.getBBox();
                var offsetX = ctm.e;
                var offsetY = ctm.f;
                var width = bbox.width;
                var height = bbox.height;
                var itemLeft = width + offsetX / this.canvasScale;
                var itemTop = height + offsetY / this.canvasScale;
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
            };
        };
        // 构造线对象
        SvgCanvas.prototype.CreateLineElement = function () {
            new SvgElement_2.SvgElementLineItem(this, this.activedShape);
        };
        // 重置操作panel的显示
        SvgCanvas.prototype.ResetHandlerPanel = function (element) {
            if (element) {
                if (element.ElementType.toUpperCase() == 'LINE') {
                    var points = element['operatePoints'];
                    this.lineMidOperateSvg.setAttribute('cx', points[0][0].toString());
                    this.lineMidOperateSvg.setAttribute('cy', points[0][1].toString());
                    this.lineMidOperateSvg.setAttribute('display', 'block');
                    this.groupElement.appendChild(this.lineMidOperateSvg);
                    this.lineEndOperateSvg.setAttribute('cx', points[1][0].toString());
                    this.lineEndOperateSvg.setAttribute('cy', points[1][1].toString());
                    this.lineEndOperateSvg.setAttribute('display', 'block');
                    this.groupElement.appendChild(this.lineEndOperateSvg);
                }
                else {
                    var svgElement = element.SvgElement;
                    var transfrom = svgElement.getAttribute('transform');
                    var firstChild = svgElement.firstChild;
                    var bbox = firstChild.getBBox();
                    this.elementOperateSvg.setAttribute('transform', transfrom +
                        ' translate(' + (bbox.width + bbox.x + 1) + ',' + (bbox.height / 2 + bbox.y - 5) + ')');
                    this.elementOperateSvg.setAttribute('display', 'block');
                    this.groupElement.appendChild(this.elementOperateSvg);
                }
            }
            else {
                this.elementOperateSvg.setAttribute('display', 'none');
                this.lineMidOperateSvg.setAttribute('display', 'none');
                this.lineEndOperateSvg.setAttribute('display', 'none');
                if (this.activedLine) {
                    this.activedLine.HideTangentLines();
                }
            }
        };
        // 通过id获取element对象
        SvgCanvas.prototype.GetSvgElementById = function (id) {
            var allElements = this.svgElementBaseCollection;
            for (var i = 0, len = allElements.length; i < len; i++) {
                var itemId = allElements[i].Id;
                if (itemId === id) {
                    return allElements[i];
                }
            }
            return null;
        };
        // 显示线蒙层
        SvgCanvas.prototype.ShowLineMaskSvg = function () {
            var centerPoint = SvgUtility_1.default.GetElementCenterPoint(this.Activedshape);
            var firstChild = this.Activedshape.SvgElement.firstChild;
            var bbox = firstChild.getBBox();
            this.lineMaskOperateSvg.setAttribute('cx', centerPoint[0].toString());
            this.lineMaskOperateSvg.setAttribute('cy', centerPoint[1].toString());
            this.lineMaskOperateSvg.setAttribute('r', (bbox.width + 50).toString());
            this.lineMaskOperateSvg.setAttribute('display', 'block');
            this.svgMaskSvg.setAttribute('display', 'block');
            this.groupElement.appendChild(this.svgMaskSvg);
            this.groupElement.appendChild(this.lineMaskOperateSvg);
        };
        // 隐藏线蒙层
        SvgCanvas.prototype.HideLineMaskSvg = function () {
            this.lineMaskOperateSvg.setAttribute('display', 'none');
            this.svgMaskSvg.setAttribute('display', 'none');
            this.selectedElement = null;
            this.onCancelSelect();
            this.ResetHandlerPanel();
        };
        // 更新所有选中元素的相对offset
        SvgCanvas.prototype.updateSelectedElementsOffset = function (shape) {
            var selectedElements = this.selectService.GetSelectableCollection();
            var shapeX = shape.Translate[0];
            var shapeY = shape.Translate[1];
            var len = selectedElements.length;
            for (var i = 0; i < len; i++) {
                var item = selectedElements[i];
                var itemX = item.Translate[0], itemY = item.Translate[1];
                item.RelativeOffsetX = shapeX - itemX;
                item.RelativeOffsetY = shapeY - itemY;
            }
        };
        // 更新选中图形的位置
        SvgCanvas.prototype.updateSelectedElements = function (shape) {
            var selectedElements = this.selectService.GetSelectableCollection();
            var shapeX = shape.Translate[0];
            var shapeY = shape.Translate[1];
            var len = selectedElements.length;
            for (var i = 0; i < len; i++) {
                var item = selectedElements[i];
                if (item.Id == shape.Id) {
                    continue;
                }
                var x = shapeX - item.RelativeOffsetX;
                var y = shapeY - item.RelativeOffsetY;
                item.SetTanslate(x, y);
                this.UpdateSelectRect(item);
                this.MoveLines(item);
                this.PaperFitToContent(item);
            }
        };
        // 显示画布
        SvgCanvas.prototype.Show = function () {
            this.svgCanvasElement.setAttribute('display', 'block');
            SvgCanvas.CurrentCanvas = this;
        };
        // 隐藏画布
        SvgCanvas.prototype.Hide = function () {
            this.svgCanvasElement.setAttribute('display', 'none');
        };
        // 销毁该画布
        SvgCanvas.prototype.Distory = function () {
            this.svgCanvasElement.parentNode.removeChild(this.svgCanvasElement);
        };
        // 画布缩放
        SvgCanvas.prototype.ScaleCanvas = function (scale) {
            this.canvasScale = scale;
            this.groupElement.setAttribute('transform', 'scale(' + scale + ')');
            this.svgCanvasElement.setAttribute('width', (this.canvasWidth * scale).toFixed(2));
            this.svgCanvasElement.setAttribute('height', (this.canvasHeight * scale).toFixed(2));
            this.svgMaskSvg.setAttribute('width', this.canvasWidth.toFixed(2));
            this.svgMaskSvg.setAttribute('height', this.canvasHeight.toFixed(2));
        };
        // 改变指定元素的业务类型
        SvgCanvas.prototype.ChangeElementByOutside = function (id, targetType) {
            var element = this.GetSvgElementById(id);
            if (element.ElementType == 'shape') {
                element = element;
            }
            else {
                element = element;
            }
        };
        // 生成副本
        SvgCanvas.prototype.CloneShapeElement = function (operateShape) {
            // let operateShape = this.GetSvgElementById(shapeId);
            if (operateShape) {
                var clonedNode = operateShape.SvgElement.cloneNode(true);
                var clonedShapeItem = new SvgElement_1.SvgElementShapeItem(clonedNode, this);
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
        };
        Object.defineProperty(SvgCanvas.prototype, "Activedshape", {
            get: function () {
                return this.activedShape;
            },
            set: function (element) {
                this.activedShape = element;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(SvgCanvas.prototype, "LineElement", {
            set: function (element) {
                this.activedLine = element;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(SvgCanvas.prototype, "ActivedLine", {
            get: function () {
                return this.activedLine;
            },
            set: function (element) {
                this.activedLine = element;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(SvgCanvas.prototype, "LineModels", {
            get: function () {
                return this.lineModels;
            },
            set: function (models) {
                this.lineModels = models;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(SvgCanvas.prototype, "ElementMoving", {
            set: function (moving) {
                this.elementMoving = moving;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(SvgCanvas.prototype, "ElementClicked", {
            set: function (selected) {
                this.elementClicked = selected;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(SvgCanvas.prototype, "SelectedElement", {
            get: function () {
                return this.selectedElement;
            },
            set: function (element) {
                this.selectedElement = element;
                if (element) {
                    this.onElementSelected(element);
                }
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(SvgCanvas.prototype, "CanvasScale", {
            get: function () {
                return this.canvasScale;
            },
            enumerable: true,
            configurable: true
        });
        SvgCanvas.prototype.removeActivedElement = function () {
            this.activedShape = undefined;
        };
        Object.defineProperty(SvgCanvas.prototype, "SelectService", {
            get: function () {
                return this.selectService;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(SvgCanvas.prototype, "SvgCanvasWidth", {
            //获取 画布宽度
            get: function () {
                return new Number(this.svgCanvasElement.getAttribute("width"));
            },
            //设置 画布宽度
            set: function (newWidth) {
                this.svgCanvasElement.setAttribute("width", newWidth.toString());
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(SvgCanvas.prototype, "SvgCanvasHeight", {
            //获取 画布宽度
            get: function () {
                return new Number(this.svgCanvasElement.getAttribute("height"));
            },
            //设置 画布宽度
            set: function (newheight) {
                this.svgCanvasElement.setAttribute("height", newheight.toString());
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(SvgCanvas.prototype, "Id", {
            //获取画布Id
            get: function () {
                return this.id;
            },
            //获取画布Id
            set: function (id) {
                this.id = id;
            },
            enumerable: true,
            configurable: true
        });
        SvgCanvas.prototype.setViewBox = function (rect) {
            var viewBoxValue = rect.StartPoint.X.toString() + " " + rect.StartPoint.Y.toString() + " " + rect.Width.toString() + " " + rect.Heigth.toString();
            this.svgCanvasElement.setAttribute("viewBox", viewBoxValue);
        };
        SvgCanvas.prototype.GetHorizontalOffset = function () {
            var str = this.svgCanvasElement.getAttribute("viewBox");
            var horizontalOffset = 0;
            if (str != null) {
                var viewBoxArray = str.split(" ");
                ;
                horizontalOffset = new Number(viewBoxArray[0]);
            }
            return horizontalOffset;
        };
        SvgCanvas.prototype.GetVerticalOffset = function () {
            var str = this.svgCanvasElement.getAttribute("viewBox");
            var verticalOffset = 0;
            if (str != null) {
                var viewBoxArray = str.split(" ");
                ;
                verticalOffset = new Number(viewBoxArray[1]);
            }
            return verticalOffset;
        };
        SvgCanvas.prototype.SetHorizontalOffset = function (offset) {
            if (this.viewBoxRect != null) {
                this.viewBoxRect.StartPoint.X = offset;
                this.setViewBox(this.viewBoxRect);
            }
        };
        SvgCanvas.prototype.SetVerticalOffset = function (offset) {
            if (this.viewBoxRect != null) {
                this.viewBoxRect.StartPoint.Y = offset;
                this.setViewBox(this.viewBoxRect);
            }
        };
        SvgCanvas.prototype.SetBackgroundColor = function (color) {
            this.svgCanvasElement.style.backgroundColor = color;
        };
        //获取画布位置
        SvgCanvas.prototype.getBoundingClientRect = function () {
            return this.svgCanvasElement.getBoundingClientRect();
        };
        //添加到画布
        SvgCanvas.prototype.AddSvgElementBaseCollection = function (svgElementBase) {
            this.svgElementBaseCollection.push(svgElementBase);
        };
        SvgCanvas.prototype.GetSvgElementsInCanvas = function () {
            return this.svgElementBaseCollection;
        };
        return SvgCanvas;
    })();
    exports.SvgCanvas = SvgCanvas;
});
