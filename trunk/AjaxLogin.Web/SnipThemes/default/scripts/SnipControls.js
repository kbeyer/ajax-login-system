//------------------------------------
// Implementation of:
//  - Snip namepace
//  - Snip.LoginControl class
//  - Snip.RegisterControl class
//
// BSD License: http://www.opensource.org/licenses/bsd-license.php
//Copyright (c) 2007, Kyle Beyer (http://daptivate.com)
//All rights reserved.
//
//Redistribution and use in source and binary forms, with or without modification, are permitted provided that the following conditions are met:
//
//Redistributions of source code must retain the above copyright notice, this list of conditions and the following disclaimer. 
//Redistributions in binary form must reproduce the above copyright notice, this list of conditions and the following disclaimer in the documentation and/or other materials provided with the distribution. 
//Neither the name of the organization nor the names of its contributors may be used to endorse or promote products derived from this software without specific prior written permission. 
//THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
//------------------------------------
 
//
// Namespace
var Snip = (function(){
    //
    // private namespace members
    var _debug = 1;    
    //
    // password length (private)
    var _pLength = 6;
    //
    // status control
    var _status = null;            
    //
    // username
    var _username = '';    
    //
    // authentication status
    var _auth = false;
    //
    // persist cookie flag
    var _persistCookie = false;
    
    //
    // private namespace functions
    
    //
    // helper function to clear a control's value and give back focus
    function ClearControl(ctrl, giveFocus){
        ctrl.value = '';
        if( giveFocus ){ ctrl.focus(); }
    }
      
    //
    // username validation
    function CheckUsername(u){
        var filter  = /^[0-9a-zA-Z_\.\-\s]+$/;
        return filter.test(u);
    }
          
    //
    // e-mail validation
    function CheckMail(e){
        var filter  = /^([a-zA-Z0-9_\.\-])+\@(([a-zA-Z0-9\-])+\.)+([a-zA-Z0-9]{2,4})+$/;
        return filter.test(e);
    }
    
    //
    // common timeout method
    function OnTimeout(result){
        SetStatus("Sorry, the request was taking too long.  Please try again.", "bad");
    }
        
    //
    // common error method
    function OnError(result){        
        var resultMessage = result.get_message();
        var errorMessage = "Exception: " + resultMessage;    
        errorMessage = errorMessage + "\n-----------------------------------\n";
        errorMessage = errorMessage + " StackTrace: + ";
        errorMessage = errorMessage + result.get_stackTrace();
       
        if( _debug == 1 ){
            alert(errorMessage); 
        }   
        SetStatus("Error: " + resultMessage + ".", "bad");
    }
    
    //
    // called when status needs displayed
    function SetStatus(m, t){
        _status.style.display = "block";
        _status.innerHTML = m;
        
        if( t == "bad" ){
            _status.className = 'form-status bad';
        }else if( t == "good" ){
            _status.className = 'form-status good';                
        }else{
            _status.className = 'form-status ok';               
        }
    }
    //
    // called when status needs cleared
    function ClearStatus(){
        _status.innerHTML = '';
        _status.style.display = "none";
    }
    
    return {             
        //
        // LoginControl javascript object
        //
        LoginControl : function(eID, pID, sID, cID, aID, uID){
        
            //
            // declare request objects (private)
            var _saltRequest = null;
            var _loginRequest = null;
            //
            // declare form control names/ids
            var _eID = eID;
            var _pID = pID;
            var _sID = sID;            
            var _cID = cID; 
            var _aID = aID;           
            var _uID = uID;           
            //
            // declare document control vars (public)
            var _e = null;
            var _p = null;
            var _c = null;            
            //
            // set status control
            _status = null;            
            //
            // open status
            var _open = false;            
            //
            // login callbacks
            var _loginCallback = null;
            var _logoutCallback = null;     
           
            // --------------------------------------------
            // PUBLIC LoginControl Functions            
            // --------------------------------------------
                     
            //
            // used to initialize authentication status from 
            // optional hidden field (aID) populated by server  
            // and username field (uID) pupulated by server
            this.init_fields = function(){
                // get server auth status
                var aF = document.getElementById(_aID);
                if( aF != null ){
                    var val = aF.value;
                    if( val != null && val.length > 0 ){
                        _auth = val=='True'?true:false;
                    }
                }
                // get server username
                var uF = document.getElementById(_uID);
                if( uF != null ){
                    var val = uF.value;
                    if( val != null && val.length > 0 ){
                        _username = val;
                    }else{
                        _auth = false;
                    }
                }
            }
            
            //
            // used to get authenication status
            this.get_auth = function(){
                return _auth;
            };            
            //
            // used to get authenicated username
            this.get_username = function(){
                return _username;
            };            
            //
            // used to set login callback function
            this.set_loginCallback = function(value){
                _loginCallback = value;
            };
            //
            // used to set logout callback function
            this.set_logoutCallback = function(value){
                _logoutCallback = value;
            };
            //
            // used to get open status
            this.IsOpen = function(){
                return _open;
            };
            
            //
            // used to set pwd length
            this.PLength = function(n){
                _pLength = n;
            };
            
            //
            // called when login button is pressed
            // if 'remember me' is checked then true should be passed in.
            this.LoginUser = function(remember){
                // email validation
                var e = _e.value; 
                if( e == null || e == ''){
                    SetStatus("You must enter an Email.", "bad");
                    ClearControl(_e, true);
                    return;
                }
                if( !CheckMail(e) ){
                    SetStatus("Invalid Email.", "bad");
                    _e.focus();        
                    return;
                }
                
                // password validation
                var p1 = _p.value; 
                if( p1 == null || p1 == ''){
                    SetStatus("You must enter a password.", "bad");
                    ClearControl(_p, true);
                    return;
                }
                if( p1.length < _pLength ){
                    SetStatus("Your password must be more than " + _pLength + " characters.", "bad");
                    ClearControl(_p, true);        
                    return;
                }  
                // save persist flag
                _persistCookie = remember;
                
                SetStatus("Verifying information...");
                VerifyUserName(_e.value);
            };
            
            //
            // called when logout button is pressed
            this.LogoutUser = function(){                
                if( _auth ){
                    snip.AuthenticationService.Logout(
                                            OnLogoutComplete,
                                            OnTimeout,
                                            OnError);          
                }
            };
            
            //
            // opens the control
            this.Open = function(){
                // show form
                _c = document.getElementById(_cID);
                _c.style.display = "block";                
                
                // get references to controls
                _e = document.getElementById(_eID);
                _p = document.getElementById(_pID);
                _status = document.getElementById(_sID);
                
                // clear fields & set focus
                ClearControl(_p, false);
                ClearControl(_e, true);
                
                _open = true;
            };
            
            //
            // closes the control
            this.Close = function(){
                if( _open ){
                    // clear fields
                    ClearControl(_p, false);
                    ClearControl(_e, true);
                    ClearStatus();
                    // hide
                    _c.style.display = "none";
                }    
                _open = false;
            };
            
            //
            // performs event for a key press
            this.KeyPressed = function(evt, target){                
                if (evt && evt.keyCode == 13 && !(evt.srcElement && (evt.srcElement.tagName.toLowerCase() == "textarea"))) {
                    var defaultButton = document.getElementById(target);

                    if (defaultButton && typeof(defaultButton.click) != "undefined") {
                        defaultButton.click();
                        evt.cancelBubble = true;
                        if (evt.stopPropagation){ evt.stopPropagation(); }
                        return false;
                    }
                }
                return true;
            };
            
            // --------------------------------------------
            // PRIVATE LoginControl Functions            
            // --------------------------------------------
            
            //
            // verifies username against membership store
            function VerifyUserName(u){
                _saltRequest = new snip.SaltRequest();
                _saltRequest.username = u;
                
                snip.AuthenticationService.VerifyUserLogin(_saltRequest,
                                                            OnVerifyComplete,
                                                            OnTimeout,
                                                            OnError);    
            }
            
            //
            // called when username verification completes
            function OnVerifyComplete(result){
                if(result.success){
                    CompleteLogin(result.salt, result.challenge);
                }else{
                    SetStatus("Sorry, " + _e.value + " is not a registered email.  Would you like to <a href='#join' onclick=\"_loginControl.Close(); _registerControl.Open();\">Join</a>?", "bad");
                    ClearControl(_e, true);
                }
            }

            //
            // called after email is verified
            function CompleteLogin(s, c){
                SetStatus("Checking Password...");               
                
                _loginRequest = new snip.LoginRequest();    
                _loginRequest.username = _e.value;
                var pwd_hmac = b64_hmac_sha1(s, _p.value);
                _loginRequest.passwordHMAC = b64_hmac_sha1(c, pwd_hmac).toString();
                _loginRequest.createCookie = _persistCookie;  
                
                snip.AuthenticationService.Login(_loginRequest,
                                                OnLoginComplete,
                                                OnTimeout,
                                                OnError);
            }
            
            //
            // called when authentication check completes
            function OnLoginComplete(result){
                if( result.status ){
                    _auth = true;
                    _username = result.username;
                    if( _loginCallback != null && typeof(_loginCallback) == 'function' ){
                        _loginCallback();
                    }else{
                        SetStatus("Welcome, " + _username + ".", "good");
                    }
                }
                else{
                    _auth = false;
                    SetStatus("Invalid password. Please try again.", "bad");
                    ClearControl(_p, true);
                } 
            }
            
            //
            // called when logout request completes
            function OnLogoutComplete(result){
                _auth = false;
                _username = '';
                if( _logoutCallback != null && typeof(_logoutCallback) == 'function' ){
                    _logoutCallback();
                }else{
                    SetStatus("Successfully signed out.", "good");
                }
            }
            
        }, // end LoginControl
        
        
        //
        // RegisterControl javascript object
        //
        RegisterControl : function(uID, eID, p1ID, p2ID, sID, cID){
        
            //
            // declare request objects (private)
            var _registerRequest = null;
            var _checkRegistrationRequest = null;
            //
            // declare document control vars (public)
            var _uID = uID;   // username control ID
            var _eID = eID;   // email control ID
            var _p1ID = p1ID; // password 1 control ID
            var _p2ID = p2ID; // password 2 control ID
            var _cID = cID; // RegisterControl content wrapper ID
            var _sID = sID; // RegisterControl content wrapper ID
            //
            // declare document control vars (public)
            var _u = null;   // username control
            var _e = null;   // email control
            var _p1 = null; // password 1 control
            var _p2 = null; // password 2 control
            var _c = null; // RegisterControl content wrapper                        
            //
            // set status control
            _status = null;            
            //
            // called when registration is complete
            var _registerCallback = null;            
            //
            // open status
            var _open = false;
            
            // --------------------------------------------
            // PUBLIC RegisterControl Functions            
            // --------------------------------------------
                    
            //
            // used to set login callback function
            this.set_registerCallback = function(value){
                _registerCallback = value;
            };
            //
            // used to set password length
            this.PLength = function(value){
                _pLength = value;
            };
            
            //
            // called when register button is pressed
            // if 'remember me' is checked then true should be passed in.
            this.RegisterUser = function(remember){  
            
                // email validation
                var e = _e.value; 
                if( e == null || e == ''){
                    SetStatus("You must enter an Email.", "bad");
                    ClearControl(_e, true);
                    return;
                }
                if( !CheckMail(e) ){
                    SetStatus("Invalid Email.", "bad");
                    _e.focus();        
                    return;
                } 
                
                // username validation
                var u = _u.value; 
                if( u == null || u == ''){
                    SetStatus("You must enter a Screen Name.", "bad");
                    ClearUsername(true);
                    return;
                }
                if( !CheckUsername(u) ){
                    SetStatus("Your Screen Name has invalid characters.", "bad");
                    _u.focus();        
                    return;
                }    
                
                // password validation
                var p1 = _p1.value;    
                var p2 = _p2.value;  
                if( p1 != p2){
                    SetStatus("Please re-enter your passwords.  They don't match.", "bad");
                    ClearControl(_p1, true);
                    ClearControl(_p2, false);
                    return;
                }    
                if( p1 == null || p1 == ''){
                    SetStatus("You must enter a password.");
                    ClearControl(_p1, true);
                    ClearControl(_p2, false);
                    return;
                }
                if( p1.length < _pLength ){
                    SetStatus("Your password must be more than " + _pLength + " characters.", "bad");
                    ClearControl(_p1, true);
                    ClearControl(_p2, false);   
                    return;
                }  
                
                // save persist flag
                _persistCookie = remember;
                
                // step 1 in registration
                SetStatus("Checking information...");
                AttemptRegistration(u, e);
            };
                        
            this.Open = function(){
                // show form
                _c = document.getElementById(_cID);
                _c.style.display = "block";                
                
                // get references to controls
                _u = document.getElementById(_uID);
                _e = document.getElementById(_eID);
                _p1 = document.getElementById(_p1ID);
                _p2 = document.getElementById(_p2ID);
                _status = document.getElementById(_sID);
                
                // clear fields & set focus
                ClearControl(_p1, false);
                ClearControl(_p2, false);
                ClearControl(_e, true);
                ClearControl(_u, false);
                
                _open = true;
            };
            
            this.Close = function(){
                if( _open ){
                    // clear fields                
                    ClearControl(_p1, false);
                    ClearControl(_p2, false);
                    ClearControl(_e, true);
                    ClearControl(_u, false);
                    ClearStatus();
                    // hide
                    _c.style.display = "none";
                }
                
                _open = false;
            };
            
            //
            // performs event for a key press
            this.KeyPressed = function(evt, target){                
                if (evt && evt.keyCode == 13 && !(evt.srcElement && (evt.srcElement.tagName.toLowerCase() == "textarea"))) {
                    var defaultButton = document.getElementById(target);

                    if (defaultButton && typeof(defaultButton.click) != "undefined") {
                        defaultButton.click();
                        evt.cancelBubble = true;
                        if (evt.stopPropagation){ evt.stopPropagation(); }
                        return false;
                    }
                }
                return true;
            };
            
            // --------------------------------------------
            // PRIVATE RegisterControl Functions            
            // --------------------------------------------
            
            
            //
            // called when user check returns
            function OnCheckRegistrationComplete(result){    
                if(!result.email_available)
                {                 
                    SetStatus("Email already taken.  Please use a different one or <a href=\"#sign-in\" onclick=\"_registerControl.Close(); _loginControl.Open();\">Sign In</a>.", "bad");
                    ClearControl(_e, true);
                    return;
                }
                
                if(!result.username_available)
                {                 
                    SetStatus("Screen Name already taken.  Please use a different one or <a href=\"#sign-in\" onclick=\"_registerControl.Close(); _loginControl.Open();\">Sign In</a>.", "bad");
                    ClearControl(_u, true);
                    return;
                }
              
                // create registration request
                _registerRequest = new snip.RegistrationRequest();
                _registerRequest.email = _e.value;
                _registerRequest.username = _u.value;
                var p = _p1.value;
                _registerRequest.pwd = b64_hmac_sha1( result.salt, p );
                _registerRequest.salt = result.salt;
                _registerRequest.createCookie = _persistCookie;  
                
                SetStatus("Creating account...");
                
                // request user registration
                snip.AuthenticationService.RegisterUser(_registerRequest,
                                                        OnRegistrationComplete,
                                                        OnTimeout,
                                                        OnError);  
            }

            //
            // called when registration call returns
            function OnRegistrationComplete(result){
                if(result.success){
                    // set authenticated
                    _auth = true;
                    _username = _u.value;
                    // set status message
                    var s = "Account successfully created.";
                    if( result.email_sent ){
                        s += "&nbsp;&nbsp;A notification e-mail was sent to you.";            
                    }
                    s += "&nbsp;&nbsp;<a href='#' onclick='_registerControl.Close();'>OK</a>";
                    SetStatus(s, "good");
                    // callback
                    if( _registerCallback != null && typeof(_registerCallback) == 'function' ){
                        _registerCallback();
                    }
                }
                else{
                    SetStatus("Account creation failed: " + result.message + ".", "bad");
                } 
            }

            // 
            // called when client-validation is complete
            function AttemptRegistration(u, e){
                _checkRegistrationRequest = new snip.CheckRegistrationRequest(); 
                _checkRegistrationRequest.email = e;
                _checkRegistrationRequest.username = u;
                // first step: check if user exists           
                snip.AuthenticationService.CheckRegistration(_checkRegistrationRequest,
                                                             OnCheckRegistrationComplete,
                                                             OnTimeout,
                                                             OnError);
            }
            
        } // end RegisterControl

    } // end return

})(); // end Snip

// notify atlas script has loaded
if (typeof(Sys) !== 'undefined') Sys.Application.notifyScriptLoaded();