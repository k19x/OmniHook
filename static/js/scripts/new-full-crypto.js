Java.perform(function () {
    var SecretKeySpec = Java.use('javax.crypto.spec.SecretKeySpec');
    var Cipher = Java.use('javax.crypto.Cipher');
    var IvParameterSpec = Java.use('javax.crypto.spec.IvParameterSpec');
    var SecureRandom = Java.use('java.security.SecureRandom');
    var PBEKeySpec = Java.use('javax.crypto.spec.PBEKeySpec');
    var Util = {
        byteArrayToHexString: function (byteArray) {
            var hexArray = [];
            for (var i = 0; i < byteArray.length; i++) {
                var hex = (byteArray[i] & 0xFF);
                if (hex < 16) {
                    hexArray.push('0' + hex.toString(16));
                } else {
                    hexArray.push(hex.toString(16));
                }
            }
            return hexArray.join('');
        }
    };

    SecretKeySpec.$init.overload('[B', 'java.lang.String').implementation = function (keyBytes, algorithm) {
        console.log('-----------------------------------------------')
        console.log('[+] KEY: ' + Util.byteArrayToHexString(keyBytes) + ', ' + algorithm);
        // console.log('--------------------------------------------------')
        return this.$init(keyBytes, algorithm);
    };

    //////////////////////////////////////////////////////////////////////////////////////////////

    function base64Encode(str) {
        const base64Chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
        let output = "";
        let i = 0;
        while (i < str.length) {
            const chr1 = str.charCodeAt(i++);
            const chr2 = str.charCodeAt(i++);
            const chr3 = str.charCodeAt(i++);

            const enc1 = chr1 >> 2;
            const enc2 = ((chr1 & 3) << 4) | (chr2 >> 4);
            let enc3 = ((chr2 & 15) << 2) | (chr3 >> 6);
            let enc4 = chr3 & 63;

            if (isNaN(chr2)) {
                enc3 = enc4 = 64;
            } else if (isNaN(chr3)) {
                enc4 = 64;
            }

            output += base64Chars.charAt(enc1) + base64Chars.charAt(enc2) + base64Chars.charAt(enc3) + base64Chars.charAt(enc4);
        }
        return output;
    }

    // Modify Cipher.doFinal to log input and output strings
    Cipher.doFinal.overload('[B').implementation = function (input) {
        var result = this.doFinal(input);

        const data_in = Util.byteArrayToHexString(input);
        const data_out = Util.byteArrayToHexString(result);

        const byteArrayIn = [];
        for (let i = 0; i < data_in.length; i += 2) {
            byteArrayIn.push(parseInt(data_in.substr(i, 2), 16));
        }
        const stringIn = String.fromCharCode.apply(null, byteArrayIn);
        //console.log("[+] Input: " + stringIn);

        const byteArrayOut = [];
        for (let i = 0; i < data_out.length; i += 2) {
            byteArrayOut.push(parseInt(data_out.substr(i, 2), 16));
        }
        const stringOut = String.fromCharCode.apply(null, byteArrayOut);
        //console.log("[+] Output: " + stringOut);

        let base64In = '';
        let base64Out = '';

        // Check if stringIn is not readable and encode in Base64
        if (/[\x00-\x1F\x7F-\x9F]/.test(stringIn)) {
            base64In = base64Encode(stringIn);
            console.log("\n[+] Response (Base64): " + base64In);
        } else {
            console.log("\n[+] Request: " + stringIn); //Input
        }

        // Check if stringOut is not readable and encode in Base64
        if (/[\x00-\x1F\x7F-\x9F]/.test(stringOut)) {
            base64Out = base64Encode(stringOut);
            console.log("\n[+] Request (Base64): " + base64Out);
        } else {
            console.log("\n[+] Response: " + stringOut); // Output
        }

        console.log('-----------------------------------------------');
        return result;
    };

    ///////////////////////////////////////////////////////////////////////

    // Modify IvParameterSpec.$init to log IV
    IvParameterSpec.$init.overload('[B').implementation = function (iv) {
        console.log('')
        console.log('IvParameterSpec: ' + Util.byteArrayToHexString(iv));
        console.log('')
        return this.$init(iv);
    };

    SecureRandom.setSeed.overload('[B').implementation = function (seed) {
        console.log('SecureRandom setSeed: ' + Util.byteArrayToHexString(seed));
        this.setSeed(seed);
    };

    Cipher.getInstance.overload('java.lang.String').implementation = function (transformation) {
        console.log('[!] Cipher.getInstance: ' + transformation);
        return Cipher.getInstance(transformation);
    };

    PBEKeySpec.$init.overload('[C', '[B', 'int', 'int').implementation = function (password, salt, iterationCount, keyLength) {
        console.log('PBEKeySpec: Password = ' + Java.use('java.lang.String').valueOf(password) + ', Salt = ' + Util.byteArrayToHexString(salt));
        return this.$init(password, salt, iterationCount, keyLength);
    };
});
