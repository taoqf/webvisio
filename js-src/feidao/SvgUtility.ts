import {SvgElementShapeItem} from './SvgElement';
import pathIntersection from './SvgPathHelper';
import {flatten} from './SvgPathHelper';
import svg2Base64 from './Svg2Base64';

export let SvgUtility =  {
  svgNamespace : 'http://www.w3.org/2000/svg',
  uuid:getUuid,
  convertToPathData:convertToPathData,
  getElementCenterPoint:getElementCenterPoint,
  createSvgElement:createSvgElement,
  buildBezierPath:buildBezierPath,
  findIntersection:findIntersection,
  getLineLength:getLineLength,
  getLineSlope:getLineSlope,
  getPointOnLineByScale:getPointOnLineByScale,
  getMiddlePointOnMove:getMiddlePointOnMove,
  getScaleAndHeightByMiddlePoint:getScaleAndHeightByMiddlePoint,
  getSvgAsImg:getSvgAsImg,
  buildStyleCache:buildStyleCache,
  findItemInArray:findItemInArray
}

// let svgNamespace = 'http://www.w3.org/2000/svg';
let lineStyleCache = [];
// 得到 uuid
function getUuid(){
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      let r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
  });
}

// 将shape转换为path 数据
function convertToPathData(node) {
    if (node.tagName && node.tagName.toUpperCase() == 'G') {
        node = node.childNodes[0];
    }
    return flatten(node);
}

// 得到指定shape的中心点
function getElementCenterPoint(element: SvgElementShapeItem, scale) {
    let ctm = element.SvgElement.getCTM();
    let shapeRect = element.SvgElement.getBoundingClientRect();

    // start position
    let offsetX = ctm.e;
    let offsetY = ctm.f;
    let width = shapeRect.width;
    let height = shapeRect.height;
    let cx = (offsetX + width / 2) / scale;
    let cy = (offsetY + height / 2) / scale;

    return [cx, cy];
}

// 构造svg元素
function createSvgElement(type, attrs, parentNode?) {
    let element = document.createElementNS(this.svgNamespace, type);

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
function buildBezierPath(startPoint, middlePoint, endPoint, scale?) {
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
function findIntersection(element, linePath) {
    let elementPath = this.convertToPathData(element);
    let intersection = pathIntersection(elementPath, linePath);
    if (intersection.length > 0) {
        return intersection;
    } else {
        return null;
    }
}

// 通过坐标得到直线的长度
function getLineLength(startPoint: number[], endPoint: number[]) {
    let d = Math.sqrt(Math.pow((endPoint[0] - startPoint[0]), 2) +
        Math.pow((endPoint[1] - startPoint[1]), 2));
    return d;
}

// 通过坐标得到直线的斜率
function getLineSlope(startPoint: number[], endPoint: number[]) {
    let k;
    if (endPoint[0] - startPoint[0] != 0) {
        k = (endPoint[1] - startPoint[1]) / (endPoint[0] - startPoint[0]);
    }
    return k;
}

// 返回线上指定比例位置上的点
function getPointOnLineByScale(startPoint: number[], endPoint: number[], scale: number) {
    let d = this.getLineLength(startPoint, endPoint);
    let k = this.getLineSlope(startPoint, endPoint);
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
function getMiddlePointOnMove(point: number[], k: number, h: number, direction) {
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
function getScaleAndHeightByMiddlePoint(startPoint, endPoint, middlePoint) {
    let x1 = startPoint[0];
    let y1 = startPoint[1];
    let xm = middlePoint[0];
    let ym = middlePoint[1];
    let x2 = endPoint[0];
    let k = this.getLineSlope(startPoint, endPoint);
    let y = (k * k * ym + k * xm - k * x1 + y1) / (1 + k * k);
    let x = k * ym - k * y + xm;
    let scale = (x - x1) / (x2 - x1);
    let height = this.getLineLength(middlePoint, [x, y]);
    return { scale: scale, height: height };
}

// 将svg 转换为 base64 Img code
function getSvgAsImg(canvas, baseLines, svgDefs, callback) {
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
            this.buildStyleCache(lineItem);
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
            let lineStyles = this.findItemInArray('class', lineClass, lineStyleCache)['style'];
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
function buildStyleCache(node) {
    let className = node.getAttribute('class');
    for (let i = 0, len = lineStyleCache.length; i < len; i++) {
        if (lineStyleCache[i]['class'] == className) {
            return;
        }
    }

    let style = document.defaultView.getComputedStyle(node);
    let fill = 'none';
    let stroke = style['stroke'];
    let strokeWidth = style['stroke-width'];
    let strokeDash = style['stroke-dasharray'];
    let marker = style['marker-end'];

    lineStyleCache.push({
        'class': className, 'style': {
            fill: fill, stroke: stroke,
            'stroke-width': strokeWidth, 'stroke-dasharray': strokeDash, 'marker-end': marker
        }
    });
}

// 查找对象数组中的值
function findItemInArray(key, itemVal, array) {
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
