import {SvgCanvas} from './SvgCanvas';
import SvgUtility from './SvgUtility'
import {SvgElementShapeItem} from './SvgElement';

let notifyAddedEvent;
export function registerElementCreateEvent(eventFn) {
    notifyAddedEvent = eventFn;
};
export class SvgElementModel {
    //svg 画布
    private svgCanvaselement: HTMLElement;

    private svgCanvaselementRootNode: HTMLElement;
    public svgElementModelAdorner: SvgElementModelAdorner;
    private links: Object[];
    private businessType;
    private defaultText;
    private showText: boolean = false;
    public static canvasScale = 1;

    //构造函数
    constructor(svgCanvaselement: HTMLElement, links) {
        this.svgCanvaselement = svgCanvaselement;
        this.svgCanvaselementRootNode = svgCanvaselement.parentNode as HTMLElement;
        this.links = links;
        //添加事件
        this.svgCanvaselement.onmousedown = (evt: MouseEvent) => { this.StartDrag(evt); };
    }
    get svgCanvasWidth(): Number {
        return new Number(this.svgCanvaselement.getAttribute("width"));

    }
    //设置 画布宽度
    set svgCanvasWidth(newWidth: Number) {
        this.svgCanvaselement.setAttribute("width", newWidth.toString())

    }
    set svgCanvasHeight(newheight: Number) {
        this.svgCanvaselement.setAttribute("height", newheight.toString())
    }
    //获取 画布宽度
    get svgCanvasHeight(): Number {
        return new Number(this.svgCanvaselement.getAttribute("height"));

    }

    set BusinessType(type) {
        this.businessType = type;
    }

    get BusinessType() {
        return this.businessType;
    }

    get Links() {
        return this.links;
    }

    set DefaultText(text) {
        this.defaultText = text;
    }

    get DefaultText() {
        return this.defaultText;
    }

    set ShowText(isShow) {
        this.showText = isShow;
    }

    get ShowText() {
        return this.showText;
    }

    private StartDrag(evt: MouseEvent) {

        if (this.svgElementModelAdorner == null)
            this.svgElementModelAdorner = new SvgElementModelAdorner(this, evt);
    }
    public getSvgContentElement(): Node {
        return this.getSvgElementByClassName("Content") as Node;
    }
    private getSvgElementByClassName(className: string): HTMLElement {
        if (this.svgCanvaselement.childNodes.length == 0)
            return null;
        for (let index = 0; index < this.svgCanvaselement.childNodes.length; index++) {
            let node: HTMLElement = this.svgCanvaselement.childNodes[index] as HTMLElement;
            if (node != null && node.nodeType == 1) {
                if (node.getAttribute("class").toString() == className) {
                    return node;
                }
            }
        }
        return null;
    }
}

//容器类
export class SvgElementModelAdorner {
    private svgElementModel: SvgElementModel;
    private width: number;
    private height: number;
    //根节点
    private svgCanvaselementClone: HTMLElement;
    private div: HTMLElement;
    public constructor(svgElementModel: SvgElementModel, evt: MouseEvent) {
        this.svgElementModel = svgElementModel;
        this.CreateSvgElementModelAdorner(evt);
    }
    //创建容器
    private CreateSvgElementModelAdorner(evt: MouseEvent): void {
        let body: HTMLElement = document.body;
        let div: HTMLElement = document.createElement("div");

        let svgElement = document.createElementNS(SvgUtility.svgNamespace, 'svg');

        this.width = this.svgElementModel.svgCanvasWidth as number;
        this.height = this.svgElementModel.svgCanvasHeight as number;
        let svgContent = this.svgElementModel.getSvgContentElement();
        div.style.cursor = "move";
        this.div = div;
        this.div.setAttribute("class", "modelAdorner");
        this.div.style.width = this.width + "px";
        this.div.style.height = this.height + "px";
        this.div.style.left = evt.clientX - evt.offsetX + "px";
        this.div.style.top = evt.clientY - evt.offsetY + "px";
        svgElement.setAttribute("width", this.width.toString());
        svgElement.setAttribute("height", this.height.toString());
        svgElement.appendChild(svgContent.cloneNode(true));
        this.div.appendChild(svgElement);
        body.appendChild(this.div);
        body.onmousemove = (evt: MouseEvent) => { this.DoDrag(evt); };
        this.div.onmouseup = (evt: MouseEvent) => { this.EndDrag(evt) };

    }

    private DoDrag(evt: MouseEvent): void {
        this.div.style.left = evt.clientX - this.width / 2 + "px";
        this.div.style.top = evt.clientY - this.height / 2 + "px";
    }
    private EndDrag(evt: MouseEvent) {
        this.DestroySvgElementModelAdorner(evt);
    }
    public DestroySvgElementModelAdorner(evt: MouseEvent): void {
        //处理当前画布 内容
        if (this.div != null) {
            let body: HTMLElement = document.body;
            body.removeChild(this.div);
            this.svgElementModel.svgElementModelAdorner = null;
            if (SvgCanvas.CurrentCanvas != null) {
                let canvasRect = SvgCanvas.CurrentCanvas.getBoundingClientRect();
                if (evt.clientX > canvasRect.left && evt.clientX < canvasRect.right && evt.clientY > canvasRect.top && evt.clientY < canvasRect.bottom) {
                    let viewPointElement = this.svgElementModel.getSvgContentElement();
                    if (viewPointElement != null) {
                        let shapeItem: SvgElementShapeItem = new SvgElementShapeItem(viewPointElement.cloneNode(true) as SVGSVGElement, SvgCanvas.CurrentCanvas);
                        let x: number = (evt.clientX - canvasRect.left - this.width * SvgElementModel.canvasScale / 2) / SvgElementModel.canvasScale;
                        let y: number = (evt.clientY - canvasRect.top - this.height * SvgElementModel.canvasScale / 2) / SvgElementModel.canvasScale;
                        shapeItem.SetTanslate(x, y);
                        shapeItem.Links = this.svgElementModel.Links;
                        shapeItem.BusinessType = this.svgElementModel.BusinessType;
                        shapeItem.SetText(this.svgElementModel.DefaultText, !this.svgElementModel.ShowText);
                        SvgCanvas.CurrentCanvas.PaperFitToContent(shapeItem);
                        notifyAddedEvent(SvgCanvas.CurrentCanvas, shapeItem);
                    }
                }
            }
        }

    }
}
