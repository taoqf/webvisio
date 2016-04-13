define(["require", "exports", './SvgPathHelper', './SvgPathHelper', './Svg2Base64'], function (require, exports, SvgPathHelper_1, SvgPathHelper_2, Svg2Base64_1) {
    var SvgUtility = (function () {
        function SvgUtility() {
        }
        // 得到 uuid
        SvgUtility.uuid = function () {
            return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
                var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
                return v.toString(16);
            });
        };
        // 将shape转换为path 数据
        SvgUtility.ConvertToPathData = function (node) {
            var tagName = node.tagName.toUpperCase();
            if (tagName == 'G') {
                node = node.childNodes[0];
            }
            return SvgPathHelper_2.flatten(node);
        };
        // 得到指定shape的中心点
        SvgUtility.GetElementCenterPoint = function (element) {
            var translate = element.SvgElement.getAttribute('transform');
            var translateStr = translate.substring(translate.indexOf('(') + 1, translate.length - 1);
            var splitOperator = ',';
            if (translateStr.indexOf(splitOperator) == -1) {
                splitOperator = ' ';
            }
            var points = translateStr.split(splitOperator);
            var firstChild = element.SvgElement.firstChild;
            var BBox = firstChild.getBBox();
            var cyOffset = BBox.height;
            var cxOffset = BBox.width;
            var cx = parseInt(points[0]) + cxOffset / 2 + BBox.x;
            var cy = parseInt(points[1]) + cyOffset / 2 + BBox.y;
            return [cx, cy];
        };
        // 构造svg元素
        SvgUtility.CreateSvgElement = function (type, attrs, parentNode) {
            var element = document.createElementNS(SvgUtility.svgNamespace, type);
            if (attrs.length) {
                for (var i = 0; i < attrs.length; i++) {
                    element.setAttribute(attrs[i]['attr'], attrs[i]['val']);
                }
            }
            else {
                for (var key in attrs) {
                    element.setAttribute(key, attrs[key]);
                }
            }
            if (parentNode) {
                parentNode.appendChild(element);
            }
            return element;
        };
        // 构造2次贝塞尔曲线
        SvgUtility.BuildBezierPath = function (startPoint, middlePoint, endPoint, scale) {
            if (!startPoint || !middlePoint || !endPoint) {
                return;
            }
            if (!scale) {
                scale = 1;
            }
            var startX = startPoint[0] * scale;
            var startY = startPoint[1] * scale;
            var middleX = middlePoint[0] * scale;
            var middleY = middlePoint[1] * scale;
            var endX = endPoint[0] * scale;
            var endY = endPoint[1] * scale;
            var t = 0.5;
            var divisor = 2 * t * (1 - t);
            var x1 = ((middleX - (1 - t) * (1 - t) * startX - t * t * endX) / divisor).toFixed(2);
            var y1 = ((middleY - (1 - t) * (1 - t) * startY - t * t * endY) / divisor).toFixed(2);
            return 'M' + startX + ',' + startY + " " + 'Q' + x1 + ',' + y1 + ' ' + endX + ',' + endY;
        };
        // 返回两个path的交点
        SvgUtility.FindIntersection = function (element, linePath) {
            var elementPath = this.ConvertToPathData(element.SvgElement);
            var intersection = SvgPathHelper_1.default(linePath, elementPath);
            if (intersection.length > 0) {
                return intersection;
            }
            else {
                return null;
            }
        };
        // 通过坐标得到直线的长度
        SvgUtility.GetLineLength = function (startPoint, endPoint) {
            var d = Math.sqrt(Math.pow((endPoint[0] - startPoint[0]), 2) +
                Math.pow((endPoint[1] - startPoint[1]), 2));
            return d;
        };
        // 通过坐标得到直线的斜率
        SvgUtility.GetLineSlope = function (startPoint, endPoint) {
            var k;
            if (endPoint[0] - startPoint[0] != 0) {
                k = (endPoint[1] - startPoint[1]) / (endPoint[0] - startPoint[0]);
            }
            return k;
        };
        // 返回线上指定比例位置上的点
        SvgUtility.GetPointOnLineByScale = function (startPoint, endPoint, scale) {
            var d = this.GetLineLength(startPoint, endPoint);
            var k = this.GetLineSlope(startPoint, endPoint);
            var x1 = startPoint[0];
            var y1 = startPoint[1];
            var x2 = endPoint[0];
            var y2 = endPoint[1];
            var xc, yc;
            if (k == null) {
                return [xc, yc];
            }
            xc = x1 + (x2 - x1) * scale;
            yc = yc = k * (xc - x1) + y1;
            return [xc, yc];
        };
        // 根据直线上的点、斜率和高度获取曲线上的点
        SvgUtility.GetMiddlePointOnMove = function (point, k, h, direction) {
            var x1 = point[0];
            var y1 = point[1];
            var xc, yc;
            var a = 1 + k * k;
            var b = -2 * x1 * a;
            var c = a * x1 * x1 - h * h;
            var xc1 = (-b + Math.sqrt(b * b - 4 * a * c)) / (2 * a);
            var xc2 = (-b - Math.sqrt(b * b - 4 * a * c)) / (2 * a);
            var yc1 = k * (xc1 - x1) + y1;
            var yc2 = k * (xc2 - x1) + y1;
            if (direction > 0) {
                if (yc1 - y1 > 0) {
                    xc = xc1;
                    yc = yc1;
                }
                else {
                    xc = xc2;
                    yc = yc2;
                }
            }
            else {
                if (yc2 - y1 > 0) {
                    xc = xc1;
                    yc = yc1;
                }
                else {
                    xc = xc2;
                    yc = yc2;
                }
            }
            return [xc, yc];
        };
        // 根据线上的点得到两点连线的高度和分割的比例
        SvgUtility.GetScaleAndHeightByMiddlePoint = function (startPoint, endPoint, middlePoint) {
            var x1 = startPoint[0];
            var y1 = startPoint[1];
            var xm = middlePoint[0];
            var ym = middlePoint[1];
            var x2 = endPoint[0];
            var k = this.GetLineSlope(startPoint, endPoint);
            var y = (k * k * ym + k * xm - k * x1 + y1) / (1 + k * k);
            var x = k * ym - k * y + xm;
            var scale = (x - x1) / (x2 - x1);
            var height = this.GetLineLength(middlePoint, [x, y]);
            return { scale: scale, height: height };
        };
        // 将svg 转换为 base64 Img code
        SvgUtility.GetSvgAsImg = function (canvas, baseLines, svgDefs, callback) {
            var elements = canvas.GetSvgElementsInCanvas();
            for (var i = 0, lines = baseLines.length; i < lines; i++) {
                var className = baseLines[i]['class'];
                var businessType = baseLines[i]['businessType'];
                var lineItem = void 0;
                for (var j = 0, len = elements.length; j < len; j++) {
                    var item = elements[j];
                    if (item['ElementType'] == 'line' && item['BusinessType'] == businessType) {
                        lineItem = item.LineSvg;
                        break;
                    }
                }
                if (lineItem) {
                    this.BuildStyleCache(lineItem);
                }
            }
            var svgNode = canvas.svgCanvasElement.cloneNode(true);
            var nodes = svgNode.childNodes[0].childNodes;
            // 将调用class的线元素添加具体的style
            for (var i = 0; i < nodes.length; i++) {
                var nodeItem = nodes[i];
                if (nodeItem.nodeName == 'g' && nodeItem.getAttribute('class') == 'line') {
                    console.log(nodeItem);
                    var lineNode = nodeItem.firstChild;
                    var lineClass = lineNode.getAttribute('class');
                    var lineStyles = this.findItemInArray('class', lineClass, this.lineStyleCache)['style'];
                    for (var key in lineStyles) {
                        lineNode.setAttribute(key, lineStyles[key]);
                    }
                }
            }
            if (svgDefs) {
                svgNode.appendChild(svgDefs);
            }
            svgNode.setAttribute('style', 'background:white');
            // TODO 只导出有效大小的画布，需重设宽高，scale和每个元素的translate
            Svg2Base64_1.default(svgNode, '', callback);
        };
        // 构造 line style cache
        SvgUtility.BuildStyleCache = function (node) {
            var className = node.getAttribute('class');
            for (var i = 0, len = this.lineStyleCache.length; i < len; i++) {
                if (this.lineStyleCache[i]['class'] == className) {
                    return;
                }
            }
            var style = document.defaultView.getComputedStyle(node);
            var fill = 'none';
            var stroke = style['stroke'];
            var strokeWidth = style['stroke-width'];
            var strokeDash = style['stroke-dasharray'];
            var marker = style['marker-end'];
            this.lineStyleCache.push({ 'class': className, 'style': { fill: fill, stroke: stroke,
                    'stroke-width': strokeWidth, 'stroke-dasharray': strokeDash, 'marker-end': marker } });
        };
        // 查找对象数组中的值
        SvgUtility.findItemInArray = function (key, itemVal, array) {
            if (!key || !itemVal || !array) {
                return;
            }
            var len = array.length;
            for (var i = 0; i < len; i++) {
                if (array[i][key] == itemVal) {
                    return array[i];
                }
            }
        };
        SvgUtility.svgNamespace = 'http://www.w3.org/2000/svg';
        SvgUtility.lineStyleCache = [];
        return SvgUtility;
    })();
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.default = SvgUtility;
});
