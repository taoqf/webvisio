/**
 * @author 陶秋峰
 */
(function (global) {
    var root_path = 'http://61.163.79.140:8090/victop/js/';
    var baseUrl = (function () {
        var scripts = global.document.getElementsByTagName("script");
        var script = scripts[scripts.length - 1];
        var js = global.document.querySelector ? script.src : script.getAttribute("src");
        return js.replace(/\/[^\/]+$/, '') + '/../';
    })();
    global.dojoConfig = {
        packages: [{
                name: 'feidao',
                location: baseUrl + './feidao'
            }, {
                name: 'dojo',
                location: baseUrl + './dojo'
            }
        ] };
})(window);
