Java.perform(function () {
    var SSLContext = Java.use("javax.net.ssl.SSLContext");
    SSLContext.init.implementation = function(a, b, c) {
        console.log("[Bypass SSL] Hook ativado!");
        this.init(null, null, null);
    };
});
