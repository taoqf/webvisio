import {SvgElementShapeItem} from './SvgElement';
import pathIntersection from './SvgPathHelper';
import {flatten} from './SvgPathHelper';
import svg2Base64 from './Svg2Base64';

export default class SvgUtility {
    public static svgNamespace = 'http://www.w3.org/2000/svg';
    public static lineStyleCache = [];

    // 得到 uuid
    public static uuid() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            let r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }
    // 将shape转换为path 数据
    public static ConvertToPathData(node) {
        if (node.tagName && node.tagName.toUpperCase() == 'G') {
            node = node.childNodes[0];
        }
        return flatten(node);
    }

    // 得到指定shape的中心点
    public static GetElementCenterPoint(element: SvgElementShapeItem) {
        let translate = element.SvgElement.getAttribute('transform');

        let translateStr = translate.substring(translate.indexOf('(') + 1, translate.length - 1);
        let splitOperator = ',';
        if (translateStr.indexOf(splitOperator) == -1) {
            splitOperator = ' ';
        }
        let points = translateStr.split(splitOperator);
        let firstChild = element.SvgElement.firstChild as SVGSVGElement;
        let BBox = firstChild.getBBox();
        let cyOffset = BBox.height;
        let cxOffset = BBox.width;

        let cx = parseInt(points[0]) + cxOffset / 2 + BBox.x;
        let cy = parseInt(points[1]) + cyOffset / 2 + BBox.y;
        return [cx, cy];
    }

    // 构造svg元素
    public static CreateSvgElement(type, attrs, parentNode?) {
        let element = document.createElementNS(SvgUtility.svgNamespace, type);

        if (attrs.length) {
            for (let i = 0; i < attrs.length; i++) {
                element.setAttribute(attrs[i]['attr'], attrs[i]['val']);
            }
        } else {
            for (let key in attrs) {
                element.setAttribute(key, attrs[key]);
            }
        }
        if (parentNode) {
            parentNode.appendChild(element);
        }
        return element;
    }

    // 构造2次贝塞尔曲线
    public static BuildBezierPath(startPoint, middlePoint, endPoint, scale?) {
        if (!startPoint || !middlePoint || !endPoint) {
            return;
        }
        if (!scale) {
            scale = 1;
        }

        let startX = startPoint[0] * scale;
        let startY = startPoint[1] * scale;
        let middleX = middlePoint[0] * scale;
        let middleY = middlePoint[1] * scale;
        let endX = endPoint[0] * scale;
        let endY = endPoint[1] * scale;


        let t = 0.5;
        let divisor = 2 * t * (1 - t);
        let x1 = ((middleX - (1 - t) * (1 - t) * startX - t * t * endX) / divisor).toFixed(2);
        let y1 = ((middleY - (1 - t) * (1 - t) * startY - t * t * endY) / divisor).toFixed(2);

        return 'M' + startX + ',' + startY + " " + 'Q' + x1 + ',' + y1 + ' ' + endX + ',' + endY;
    }

    // 返回两个path的交点
    public static FindIntersection(element, linePath) {
        let elementPath = this.ConvertToPathData(element);
        let intersection = pathIntersection(elementPath, linePath);
        if (intersection.length > 0) {
            return intersection;
        } else {
            return null;
        }
    }

    // 通过坐标得到直线的长度
    public static GetLineLength(startPoint: number[], endPoint: number[]) {
        let d = Math.sqrt(Math.pow((endPoint[0] - startPoint[0]), 2) +
            Math.pow((endPoint[1] - startPoint[1]), 2));
        return d;
    }

    // 通过坐标得到直线的斜率
    public static GetLineSlope(startPoint: number[], endPoint: number[]) {
        let k;
        if (endPoint[0] - startPoint[0] != 0) {
            k = (endPoint[1] - startPoint[1]) / (endPoint[0] - startPoint[0]);
        }
        return k;
    }

    // 返回线上指定比例位置上的点
    public static GetPointOnLineByScale(startPoint: number[], endPoint: number[], scale: number) {
        let d = this.GetLineLength(startPoint, endPoint);
        let k = this.GetLineSlope(startPoint, endPoint);
        let x1 = startPoint[0];
        let y1 = startPoint[1];
        let x2 = endPoint[0];
        let y2 = endPoint[1];
        let xc, yc;
        if (k == null) {
            return [xc, yc];
        }
        xc = x1 + (x2 - x1) * scale;
        yc = yc = k * (xc - x1) + y1;
        return [xc, yc];
    }

    // 根据直线上的点、斜率和高度获取曲线上的点
    public static GetMiddlePointOnMove(point: number[], k: number, h: number, direction) {
        let x1 = point[0];
        let y1 = point[1];

        let xc, yc;

        let a = 1 + k * k;
        let b = -2 * x1 * a;
        let c = a * x1 * x1 - h * h;
        let xc1 = (-b + Math.sqrt(b * b - 4 * a * c)) / (2 * a);
        let xc2 = (-b - Math.sqrt(b * b - 4 * a * c)) / (2 * a);
        let yc1 = k * (xc1 - x1) + y1;
        let yc2 = k * (xc2 - x1) + y1;
        if (direction > 0) {
            if (yc1 - y1 > 0) {
                xc = xc1;
                yc = yc1;
            } else {
                xc = xc2;
                yc = yc2;
            }
        } else {
            if (yc2 - y1 > 0) {
                xc = xc1;
                yc = yc1;
            } else {
                xc = xc2;
                yc = yc2;
            }
        }
        return [xc, yc];
    }

    // 根据线上的点得到两点连线的高度和分割的比例
    public static GetScaleAndHeightByMiddlePoint(startPoint, endPoint, middlePoint) {
        let x1 = startPoint[0];
        let y1 = startPoint[1];
        let xm = middlePoint[0];
        let ym = middlePoint[1];
        let x2 = endPoint[0];
        let k = this.GetLineSlope(startPoint, endPoint);
        let y = (k * k * ym + k * xm - k * x1 + y1) / (1 + k * k);
        let x = k * ym - k * y + xm;
        let scale = (x - x1) / (x2 - x1);
        let height = this.GetLineLength(middlePoint, [x, y]);
        return { scale: scale, height: height };
    }

    // 将svg 转换为 base64 Img code
    public static GetSvgAsImg(canvas, baseLines, svgDefs, callback) {
        let elements = canvas.GetSvgElementsInCanvas();
        for (let i = 0, lines = baseLines.length; i < lines; i++) {
            let className = baseLines[i]['class'];
            let businessType = baseLines[i]['businessType'];
            let lineItem;
            for (let j = 0, len = elements.length; j < len; j++) {
                let item = elements[j];
                if (item['ElementType'] == 'line' && item['BusinessType'] == businessType) {
                    lineItem = item.LineSvg;
                    break;
                }
            }
            if (lineItem) {
                this.BuildStyleCache(lineItem);
            }
        }
        let svgNode = canvas.svgCanvasElement.cloneNode(true);

        let nodes = svgNode.childNodes[0].childNodes;
        // 将调用class的线元素添加具体的style
        for (let i = 0; i < nodes.length; i++) {
            let nodeItem = nodes[i];
            if (nodeItem.nodeName == 'g' && nodeItem.getAttribute('class') == 'line') {
                console.log(nodeItem);
                let lineNode = nodeItem.firstChild;
                let lineClass = lineNode.getAttribute('class');
                let lineStyles = this.findItemInArray('class', lineClass, this.lineStyleCache)['style'];
                for (let key in lineStyles) {
                    lineNode.setAttribute(key, lineStyles[key]);
                }
            }
        }
        if (svgDefs) {
            svgNode.appendChild(svgDefs);
        }
        svgNode.setAttribute('style', 'background:white');
        // TODO 只导出有效大小的画布，需重设宽高，scale和每个元素的translate
        svg2Base64(svgNode, '', callback);
    }

    // 构造 line style cache
    private static BuildStyleCache(node) {
        let className = node.getAttribute('class');
        for (let i = 0, len = this.lineStyleCache.length; i < len; i++) {
            if (this.lineStyleCache[i]['class'] == className) {
                return;
            }
        }

        let style = document.defaultView.getComputedStyle(node);
        let fill = 'none';
        let stroke = style['stroke'];
        let strokeWidth = style['stroke-width'];
        let strokeDash = style['stroke-dasharray'];
        let marker = style['marker-end'];

        this.lineStyleCache.push({
            'class': className, 'style': {
            fill: fill, stroke: stroke,
            'stroke-width': strokeWidth, 'stroke-dasharray': strokeDash, 'marker-end': marker
        }
        });
    }

    // 查找对象数组中的值
    public static findItemInArray(key, itemVal, array) {
        if (!key || !itemVal || !array) {
            return;
        }
        let len = array.length;
        for (let i = 0; i < len; i++) {
            if (array[i][key] == itemVal) {
                return array[i];
            }
        }
    }
}
