(function($){
  // [TODO] translations and I18n / check "lang"-Attribute
  var T = {
    "de": {},
    "en": {}
  };

  function TranspectConverter(){
    this.elementName = "transpect-convert";
    this.timedStatusRequest = null;

    this.htmlPrototype = null;
    this.htmlElement = null;

    this.serverStatusRequestURI = "/api/info";
    this.serverUploadURI = "/api/upload_file";
    this.templateID = "transpect-convert-template";
    this.initState = 0;
    this.documentState = "not_uploaded";

    this.serviceName = "DavOMat";
    this.statusCallbackURI = "";
    this.resultListURI = "";
    this.deleteURI = "";

    this.messages = [];
    this.auth = {
      "user": "name",
      "passwd": "pw"
    }
  };

  TranspectConverter.prototype.init = function(){
    $.ajaxSetup({cache: false});

    this.initializeTemplates();
    this.registerHTMLPrototype();
    this.registerHTMLCallbacks();
    this.registerTranspectConverterHTML();
  };

  TranspectConverter.prototype.initializeTemplates = function(){
    var errorTemplate = "<template id=\"transpect-error-template\"><div class=\"well\">" + 
        "<div id=\"error_area\">" + 
        "<p class=\"red\">Error: could not initialize transpect converter component</p>" + 
        "</div></div></template>";

    var componentTemplate = "<template id=\"transpect-convert-template\">\
      <div class=\"well\">\
        <div class=\"row\">\
          <div class=\"col-sm-12\">\
            <div class=\"form-group\">\
              <div class=\"col-sm-4\">\
                <label for=\"conv-type\" class=\"col-sm-3 control-label\">Konvertierung:</label>\
              </div>\
              <div class=\"col-sm-4\">\
                <input class=\"form-control\" id=\"upload_type\" name=\"upload_type\" onkeyup=\"if ($('#upload_type').val() == '') {$('#set-conv').hide();} else {$('#set-conv').show();};\" type=\"text\" />\
              </div>\
              <div class=\"col-sm-4\">\
                <span id=\"set-conv\" style=\"display:none\"><input class=\"btn btn-primary btn-sm form-control\" id=\"set-button\" name=\"set_button\" type=\"submit\" value=\"Konvertierung auswählen\" /></span>\
              </div>\
            </div>\
            <div class=\"form-group\">\
              <div class=\"col-sm-4\">\
                <label for=\"add_params\" class=\"col-sm-3 control-label\">(optionale) Parameter:</label>\
              </div>\
              <div class=\"col-sm-4\">\
                <input class=\"form-control\" id=\"add_params\" name=\"add_params\" placeholder=\"Parameter\" type=\"text\" />\
              </div>\
            </div>\
            <div class=\"form-group\">\
              <label for=\"upload_file\" class=\"col-sm-3 control-label\">Datei Hochladen:</label>\
              <div class=\"col-sm-4\" id=\"dropzone_container\">\
                <input type=\"file\" id=\"file_upload_input\" name=\"files[]\"/>\
                <input type=\"submit\" id=\"file_upload_submit\" name=\"submit\"/>\
              </div>\
            </div>\
          </div>\
        </div>\
        <div class=\"row\" id=\"result_row\">\
          <div class=\"col-sm-1\">\
            <label for=\"result_area\" class=\"control-label\">Ergebnisse:</label>\
          </div>\
          <div class=\"col-sm-11\" id=\"result_area\">\
            <p id=\"conv_running\" class=\"spinner\"><img src=\"img/spinner.gif\"></img>&#160;&#160;Konvertierung Läuft!</p>\
            <p id=\"conv_success\" class=\"success\">Konvertierung erfolgreich!</p>\
            <p id=\"conv_fail\" class=\"fail\">Konvertierung nicht erfolgreich!</p>\
          </div>\
        </div>\
        <div class=\"row\" id=\"message_row\">\
          <div class=\"col-sm-1\">\
            <label for=\"message_area\" class=\"control-label\">Meldungen:</label>\
          </div>\
          <div class=\"col-sm-11\" id=\"message_area\">\
          </div>\
        </div>\
      </div>\
    </template>";

    $("body").prepend(errorTemplate);
    $("body").prepend(componentTemplate);
  };

  TranspectConverter.prototype.basicHTTPAuthString = function(user, passwd){
    var token = user + ":" + passwd;
    var hash = btoa(token);
    return "Basic " + hash;
  };

  TranspectConverter.prototype.initiateStatusRequestLoop = function(callbackURI){
    var tc = this;
    console.log(tc.para_spinner);
    tc.para_spinner.show();

    var statusRequest = function(){
      $.ajax({
        "url": callbackURI,
        "type": "GET", 
        "crossDomain": "true",
        "processData": false, 
        "contentType": false,
        "beforeSend": function(xhr){
          xhr.setRequestHeader("Authorization", tc.basicHTTPAuthString("name", "pw"));
        },
        "success": function(data){
          if(data["result_list_uri"]){
            tc.resultListURI = data["result_list_uri"];
          }
          if(data["delete_uri"]){
            tc.deleteURI = data["delete_uri"];
          }
          if(data["message"] && data["message"] instanceof Array){
            var messageCount = data["message"].length;
            if(tc.messages.length < messageCount){
              for(var i=tc.messages.length; i<messageCount; i++){
                var newMessage = data["message"][i];
                if(newMessage){
                  var newMessagePara = $("<p>"+newMessage+"</p>");
                  tc.message_box.append(newMessagePara);
                }
              }
              tc.messages = data["message"];
            }
          }
          if(data["status"]){
            tc.documentState = data["status"];
            if(tc.timedStatusRequest != null){
              if(tc.documentState === "failure"){
                tc.para_fail.toggle();
                tc.para_spinner.hide();
                clearInterval(tc.timedStatusRequest);
              }
              if(tc.documentState === "success"){
                tc.para_success.toggle();
                tc.para_spinner.hide();
                clearInterval(tc.timedStatusRequest);
                tc.getResultList();
              }
            }
          }
        }
      });
    };

    this.messageView.toggle();
    this.resultView.toggle();
    this.timedStatusRequest = setInterval(statusRequest, 5000);
  };

  TranspectConverter.prototype.getResultList = function(){
    var tc = this;
    $.ajax({
      "url": tc.resultListURI,
      "type": "GET", 
      "crossDomain": "true",
      "processData": false, 
      "contentType": false,
      "beforeSend": function(xhr){
        xhr.setRequestHeader("Authorization", tc.basicHTTPAuthString("name", "pw"));
      },
      "success": function(data){
        if(data && data["files"]){
          var files = data["files"];
          for(var file in files){
            if(files.hasOwnProperty(file)){
              var fileLink = files[file]["download_uri"];
              var fileLinkObject = $("<p><a target=\"_blank\" href=\"" + fileLink + "\">" + file + "</a></p>");
              tc.result_box.append(fileLinkObject);
            }
          }
        }
      }
    });
  };

  TranspectConverter.prototype.initFileUpload = function(shadowDOM){
    var fileupload = shadowDOM.querySelector("#file_upload_input");
    var submit = shadowDOM.querySelector("#file_upload_submit");
    var tc = this;
    
    fileupload.addEventListener("change", tc.handleFileUpload, false);

    submit.addEventListener("click", function(evt){
      evt.preventDefault();
      var conv_type_input = document.querySelector("transpect-convert").shadowRoot.querySelector("#upload_type");
      var actualPipe = $(conv_type_input).val();
      if(actualPipe !== tc.pipeline){
        tc.pipeline = actualPipe;
      }

      var uploadURL = tc.host + tc.serverUploadURI;
      var formdata = new FormData();

      formdata.append("input_file", fileupload.files[0]);
      formdata.append("type", tc.pipeline);
      formdata.append("add_params", tc.params);

      $.ajax({
        "url": uploadURL,
        "type": "POST", 
        "crossDomain": "true",
        "processData": false, 
        "contentType": false,
        "data":formdata,
        "beforeSend": function(xhr){
          xhr.setRequestHeader("Authorization", tc.basicHTTPAuthString("name", "pw"));
        },
        "success": function(data){
          var callbackURI = data["callback_uri"];
          tc.initiateStatusRequestLoop(callbackURI);
        },
        "error": function(data){
          console.log("error while sending data");
        }
      });
      return false;
    }, false);
  };

  TranspectConverter.prototype.checkAttributes = function(htmlCaller){
    // # host and pipeline are mandatory
    var host = htmlCaller.getAttribute("host");
    var pipe = htmlCaller.getAttribute("pipeline");

    if((typeof(host) == "string" && host.length > 0) && (typeof(pipe) == "string" && pipe.length > 0)){
      this.host = host;
      this.pipeline = pipe;
      this.initState = 1;
    }
    else{
      console.log("[Transpect-Convert] Error: Mandatory attributes are not present, mandatory attributes are: host and pipeline!");
      tc.initState = 0;
    };

    // # params, lang and auth are optional
    var params = htmlCaller.getAttribute("params");
    if(typeof(params) == "string"){
      this.params = params;
    }

    var lang = htmlCaller.getAttribute("lang");
    if(typeof(lang) == "string"){
      this.params = params;
    }
    
    var auth = htmlCaller.getAttribute("auth");
    if(typeof(auth) == "string"){
      this.params = params;
    }
  };

  TranspectConverter.prototype.checkRemoteServer = function(htmlCaller){
    var server = this.host;
    var infoURL = server + this.serverStatusRequestURI;
    var tc = this;

    $.ajax({
      "url": infoURL,
      "type": "get", 
      "crossDomain": "true",
      "async": false,
      "success": function(data){
        if(data["who"] && typeof(data["who"]) == "string" && data["who"] === tc.serviceName){
          tc.initState = 1;
        }
        else{
          console.log("[Transpect-Convert] Error: could not connect to the transpect-service.");
          tc.initState = 0;
        }
      },
      "error": function(data){
        console.log("[Transpect-Convert] Error: could not connect to the transpect-service host machine.");
        tc.initState = 0;
      }
    });

    // # TODO: if auth is present: verify authentication on service, by requesting a list of all conversions
  };

  TranspectConverter.prototype.registerHTMLPrototype = function(){
    this.htmlPrototype = Object.create(HTMLElement.prototype, {
      "_pipeline": {"value": "transpect-demo", "writable": "true"},
      "pipeline": {
        "enumerable": false,
        "get": function(){return this._pipeline},
        "set": function(value){this._pipeline = value;}
      },
      "_host": {"value": "pollux:3000", "writable": "true"},
      "host": {
        "enumerable": false,
        "get": function(){return this._host},
        "set": function(value){this._host = value;}
      },
      "_params": {},
      "params": {
        "enumerable": false,
        "get": function(){return this._params},
        "set": function(value){this._params = value;}
      },
      "_lang": {},
      "lang" : {
        "enumerable": false,
        "get": function(){return this._lang},
        "set": function(value){this._lang = value;}
      },
      "_auth": {},
      "auth": {
        "enumerable": false,
        "get": function(){return this._auth},
        "set": function(value){this._auth = value;}
      }
    });
  };

  TranspectConverter.prototype.registerHTMLCallbacks = function(){
    var tc = this;

    this.htmlPrototype.createdCallback = function(){
      var template = document.querySelector("#"+tc.templateID);
      var shadowHTML = document.importNode(template.content, true);
      var shadow = this.createShadowRoot();

      tc.checkAttributes(this);
      tc.checkRemoteServer(this);

      if(tc.initState){
        console.log(tc.elementName + ": created");
        shadow.appendChild(shadowHTML);
      }
      else{
        console.log("[Transpect-Convert] Error: could not connect to remote server");

        var errorTemplate = document.querySelector("#transpect-error-template");
        var errorShadow = document.importNode(errorTemplate.content, true);
        shadow.appendChild(errorShadow);
      }
    };

    this.htmlPrototype.attachedCallback = function(){
      // important: everything, that happend insinde the template must be instantiated on attach
      tc.initFileUpload(document.querySelector("transpect-convert").shadowRoot);
      
      var conv_type_input = document.querySelector("transpect-convert").shadowRoot.querySelector("#upload_type");
      $(conv_type_input).val(this.getAttribute("pipeline"));

      var msgArea = document.querySelector("transpect-convert").shadowRoot.querySelector("#message_area");
      var resultBox = document.querySelector("transpect-convert").shadowRoot.querySelector("#result_area");
      var _msgView = document.querySelector("transpect-convert").shadowRoot.querySelector("#message_row");
      var _rsltView = document.querySelector("transpect-convert").shadowRoot.querySelector("#result_row");
      var _paraSuccess = document.querySelector("transpect-convert").shadowRoot.querySelector("#conv_success");
      var _paraFail = document.querySelector("transpect-convert").shadowRoot.querySelector("#conv_fail");
      var _paraSpinner = document.querySelector("transpect-convert").shadowRoot.querySelector("#conv_running");

      tc.result_box = $(resultBox);
      tc.message_box = $(msgArea);
      tc.messageView = $(_msgView);
      tc.resultView = $(_rsltView);
      tc.para_fail = $(_paraFail);
      tc.para_success = $(_paraSuccess);
      tc.para_spinner = $(_paraSpinner);
    };
  };

  TranspectConverter.prototype.registerTranspectConverterHTML = function(){
    if(this.htmlElement === null || this.htmlElement === undefined){
      this.htmlElement = document.registerElement(this.elementName, {
        "prototype": this.htmlPrototype,
      });
    }
    else{
      console.log("element already registered")
    }
  };


  var browserSupported = function(){
    var ensureBrowserCapabilities = {
      "Custom HTML Elements": function(){
        return document.registerElement && typeof(document.registerElement) == "function";
      },
      "HTML5 Templates": function(){
        return 'content' in document.createElement("template");
      },
      "Cross Origin Requests": function(){
        return $.support.cors;
      }
    };

    var testPassed = true;

    for (feature in ensureBrowserCapabilities){
      var capabilityTest = ensureBrowserCapabilities[feature];
      if(!capabilityTest()){
        testPassed &= false;
        console.log("Your Browser does not support: " + feature);
      }
    }

    return testPassed;
  };

  if($ === undefined || typeof($) != "function"){
    console.log("Not all dependencies are fulfilled -- missing library: jquery");
  }
  else{
    $(document).on("ready page:load", function(){
      if(browserSupported()){
        tc = new TranspectConverter();
        tc.init();
      }
      else{
        console.log("Sadly, your browser does not support Web Components!");
      }
    });
  }
})(jQuery);
