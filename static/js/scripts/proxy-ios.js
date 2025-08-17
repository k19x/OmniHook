Interceptor.attach(ObjC.classes.NSURLSession.sharedSession().configuration().protocolClasses[0].implementation, {
    onEnter: function(args) {
        var configuration = new ObjC.Object(args[0]);
        console.log("Interceptando NSURLSession...");
        
        // Configurar Proxy
        var proxyDict = ObjC.classes.NSDictionary.dictionaryWithObjectsAndKeys_(
            "10.0.0.108", "HTTPProxy",
            "8080", "HTTPPort", // Porta do proxy
            null
        );
        
        configuration.setConnectionProxyDictionary_(proxyDict);
        console.log("Proxy configurado: " + proxyDict);
    }
});
