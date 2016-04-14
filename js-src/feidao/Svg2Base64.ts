// SVG to base64 Image
export default function svg2Base64(svgNode, options, cb) {
    // return interPathHelper(path1, path2);
    requireDomNode(svgNode);

    svgAsDataUri(svgNode, options, function(uri) {
        let image = new Image();
        image.onload = function() {
            let canvas = document.createElement('canvas');
            canvas.width = image.width;
            canvas.height = image.height;
            let context = canvas.getContext('2d') as CanvasRenderingContext2D;
            if (options && options.backgroundColor) {
                context.fillStyle = options.backgroundColor;
                context.fillRect(0, 0, canvas.width, canvas.height);
            }
            context.drawImage(image, 0, 0);
            let a = document.createElement('a'), png;
            try {
                png = canvas.toDataURL('image/png');
            } catch (e) {
                throw e;
            }
            cb(png);
        }
        image.onerror = function(error) {
            console.error('There was an error loading the data URI as an image', error);
        }
        image.src = uri;
    });
};

let doctype = '<?xml version="1.0" standalone="no"?><!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">';

function svgAsDataUri(el, options, cb) {
    requireDomNode(el);

    options = options || {};
    options.scale = options.scale || 1;
    let xmlns = "http://www.w3.org/2000/xmlns/";

    inlineImages(el, function() {
        let outer = document.createElement("div");
        let clone = el.cloneNode(true);
        let width, height;
        if (el.tagName == 'svg') {
            width = options.width || getDimension(el, clone, 'width');
            height = options.height || getDimension(el, clone, 'height');
        } else if (el.getBBox) {
            let box = el.getBBox();
            width = box.x + box.width;
            height = box.y + box.height;
            clone.setAttribute('transform', clone.getAttribute('transform').replace(/translate\(.*?\)/, ''));

            let svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
            svg.appendChild(clone)
            clone = svg;
        } else {
            console.error('Attempted to render non-SVG element', el);
            return;
        }

        clone.setAttribute("version", "1.1");
        if (!clone.getAttribute('xmlns')) {
            clone.setAttributeNS(xmlns, "xmlns", "http://www.w3.org/2000/svg");
        }
        if (!clone.getAttribute('xmlns:xlink')) {
            clone.setAttributeNS(xmlns, "xmlns:xlink", "http://www.w3.org/1999/xlink");
        }
        clone.setAttribute("width", width * options.scale);
        clone.setAttribute("height", height * options.scale);
        clone.setAttribute("viewBox", [
            options.left || 0,
            options.top || 0,
            width,
            height
        ].join(" "));

        outer.appendChild(clone);

        let css = styles(el, options.selectorRemap);
        let s = document.createElement('style');
        s.setAttribute('type', 'text/css');
        s.innerHTML = "<![CDATA[\n" + css + "\n]]>";
        let defs = document.createElement('defs');
        defs.appendChild(s);
        clone.insertBefore(defs, clone.firstChild);

        let svgNode = doctype + outer.innerHTML;
        let uri = 'data:image/svg+xml;base64,' + window.btoa(reEncode(svgNode));
        if (cb) {
            cb(uri);
        }
    });
}

function isElement(obj) {
    return obj instanceof HTMLElement || obj instanceof SVGElement;
}

function requireDomNode(el) {
    if (!isElement(el)) {
        throw new Error('an HTMLElement or SVGElement is required; got ' + el);
    }
}

function isExternal(url) {
    return url && url.lastIndexOf('http', 0) == 0 && url.lastIndexOf(window.location.host) == -1;
}

function inlineImages(el, callback) {
    requireDomNode(el);

    let images = el.querySelectorAll('image'),
        left = images.length,
        checkDone = function() {
            if (left === 0) {
                callback();
            }
        };

    checkDone();
    for (let i = 0; i < images.length; i++) {
        (function(image) {
            let href = image.getAttributeNS("http://www.w3.org/1999/xlink", "href");
            if (href) {
                if (isExternal(href.value)) {
                    console.warn("Cannot render embedded images linking to external hosts: " + href.value);
                    return;
                }
            }
            let canvas = document.createElement('canvas');
            let ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
            let img = new Image();
            href = href || image.getAttribute('href');
            if (href) {
                img.src = href;
                img.onload = function() {
                    canvas.width = img.width;
                    canvas.height = img.height;
                    ctx.drawImage(img, 0, 0);
                    image.setAttributeNS("http://www.w3.org/1999/xlink", "href", canvas.toDataURL('image/png'));
                    left--;
                    checkDone();
                }
                img.onerror = function() {
                    console.log("Could not load " + href);
                    left--;
                    checkDone();
                }
            } else {
                left--;
                checkDone();
            }
        })(images[i]);
    }
}

function styles(el, selectorRemap) {
    let css = "";
    let sheets = document.styleSheets;
    for (let i = 0; i < sheets.length; i++) {
        let rules;
        try {
            let sheetItem = sheets[i] as CSSStyleSheet;
            rules = sheetItem.cssRules;
        } catch (e) {
            console.warn("Stylesheet could not be loaded: " + sheets[i].href);
            continue;
        }

        if (rules != null) {
            for (let j = 0; j < rules.length; j++) {
                let rule = rules[j] as CSSPageRule;
                if (typeof (rule.style) != "undefined") {
                    let match, selectorText;

                    try {
                        selectorText = rule.selectorText;
                    } catch (err) {
                        console.warn('The following CSS rule has an invalid selector: "' + rule + '"', err);
                    }

                    try {
                        if (selectorText) {
                            match = el.querySelector(selectorText);
                        }
                    } catch (err) {
                        console.warn('Invalid CSS selector "' + selectorText + '"', err);
                    }

                    if (match) {
                        let selector = selectorRemap ? selectorRemap(rule.selectorText) : rule.selectorText;
                        css += selector + " { " + rule.style.cssText + " }\n";
                    } else if (rule.cssText.match(/^@font-face/)) {
                        css += rule.cssText + '\n';
                    }
                }
            }
        }
    }
    return css;
}

function getDimension(el, clone, dim) {
    let v = (el.viewBox && el.viewBox.baseVal && el.viewBox.baseVal[dim]) ||
        (clone.getAttribute(dim) !== null && !clone.getAttribute(dim).match(/%$/) && parseInt(clone.getAttribute(dim))) ||
        el.getBoundingClientRect()[dim] ||
        parseInt(clone.style[dim]) ||
        parseInt(window.getComputedStyle(el).getPropertyValue(dim));
    return (typeof v === 'undefined' || v === null || isNaN(parseFloat(v))) ? 0 : v;
}

function reEncode(data) {
    data = encodeURIComponent(data);
    data = data.replace(/%([0-9A-F]{2})/g, function(match, p1) {
        let c = String.fromCharCode(Number('0x' + p1));
        return c === '%' ? '%25' : c;
    });
    return decodeURIComponent(data);
}
