Interceptor.attach(Module.findExportByName(null, "objc_msgSend"), {
    onEnter: function (args) {
        console.log("Método chamado: " + ObjC.selectorAsString(args[1]));
    }
});
