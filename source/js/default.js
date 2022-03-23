! function(n) {
    var maxWidth = 750,     // 最大宽度
        fontSize = 100,     // 字体缩放值
        defaultWidth = 320, // 默认屏幕宽度
        e = n.document,
        t = e.documentElement,
        i = maxWidth,
        d = i / fontSize,
        o = "orientationchange" in n ? "orientationchange" : "resize",
        a = function() {
            var n = t.clientWidth || defaultWidth;
            n > maxWidth && (n = maxWidth);
            t.style.fontSize = n / d + "px"
        };
    e.addEventListener && (n.addEventListener(o, a, !1), e.addEventListener("DOMContentLoaded", a, !1))
}(window);