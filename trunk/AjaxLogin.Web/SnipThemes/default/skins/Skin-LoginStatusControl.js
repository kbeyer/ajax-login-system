// This script will be automatically added to any page that uses the LoginStatusControl
// It is used for script that is specific to the Skin-LoginStatusControl.ascx skin.

// create login control
var _loginControl = new Snip.LoginControl('UserName-L', 'Password-L', 'Status-L', 'login_control', 'server-auth-status', 'server-username');
// create RegisterControl
var _registerControl = new Snip.RegisterControl('UserName-R', 'Email-R', 'Password-R', 'PasswordCheck-R', 'Status-R', 'register_control');  
// intialize login status bar to null
var _loginStatusBar = null;
//  reference to login wrapper
var _loginWrapper = null;
// control specific stylesheet
// if null or empty, it will not be dynamically loaded
var loginStatus_StyleUrl = null;//'http://localhost/AjaxLogin.Web/SnipThemes/default/skins/Skin-LoginStatusControl.css';

// the format for the link to a user's profile. 
// the url encoded username will replace {0}
// the path should be relative to root
// set to null or empty string to not have a link
var _profilePathFormat = null;//"/members/{0}.aspx";

// add control init function to atlas init
Sys.Application.add_init(InitLoginStatus);

//
// LoginStatusControl init function
function InitLoginStatus(){
    // get login status bar
    _loginStatusBar = $get('login-status-bar');
    
    // set login control callbacks
    _loginControl.set_loginCallback(OnLogin);
    _loginControl.set_logoutCallback(OnLogout);
    // set register control callbacks
    _registerControl.set_registerCallback(OnLogin);
    
    //  get reference to login wrapper
    _loginWrapper = $get('login-status-wrapper');
    
    // use CSS if IE7 or FF
    if( !document.all || navigator.appVersion.indexOf('MSIE 7.0') > 0){    
        _loginWrapper.style.position = "fixed";
    // or position function in other browsers
    }else{
        setInterval("PositionWrapper()",50);
    }
    
    if( loginStatus_StyleUrl != null && loginStatus_StyleUrl.length > 0 ){
        // dynamically add stylesheet
        if(document.createStyleSheet) {
            document.createStyleSheet(loginStatus_StyleUrl);
        }
        else {
            var styles = "@import url(' " + loginStatus_StyleUrl + " ');";
            var newSS = document.createElement('link');
            newSS.rel = 'stylesheet';
            newSS.href = 'data:text/css,'+escape(styles);
            document.getElementsByTagName("head")[0].appendChild(newSS);
        }
    }
    
    // check authentication status
    _loginControl.init_fields();
    if( _loginControl.get_auth() ){     
        _loginStatusBar.innerHTML = 'Welcome, ' + GetUsernameLink(_loginControl.get_username()) + '.  <a href="#" onclick="_registerControl.Close();_loginControl.Close();TryLogout();" title="Sign Out">Sign Out</a>.';
    }else{
        // check the url hash for control state
        checkUrlHash();
    }
}

var _pwdLength = 6;//<asp:Literal ID="PasswordLengthJS" runat="server"/>;
//
// called when login button is clicked
function LoginClicked(){            
    // pwd length
    _loginControl.PLength(_pwdLength);
    // remember me
    var persist = false;
    var r = $get('login-remember-me');
    if( r != null ){
        persist = r.checked;
    }
    // login user
    _loginControl.LoginUser(persist);
}
//
// called when register button is clicked
function RegisterClicked(){
    // set pwd length
    _registerControl.PLength(_pwdLength);
    // remember me
    var persist = false;
    var r = $get('register-remember-me');
    if( r != null ){
        persist = r.checked;
    }
    // register user
    _registerControl.RegisterUser(persist);
}  

//
// called when login succeeds
function OnLogin(){
    // verify
    if( _loginControl.get_auth() ){     
        _loginStatusBar.innerHTML = 'Welcome, ' + GetUsernameLink(_loginControl.get_username()) + '.  <a href="#" onclick="_registerControl.Close();_loginControl.Close();TryLogout();" title="Sign Out">Sign Out</a>.';
    }
    // close control
    _loginControl.Close();
    
    // check for ReturnUrl
    var currentHash = window.location.hash;
    var rUrlIndex = currentHash.indexOf('?ReturnUrl=');
    //alert(rUrlIndex);
    if( rUrlIndex > 0 ){
        var rUrl = currentHash.substring(rUrlIndex + 11, currentHash.length);
        rUrl = unescape(rUrl);
        //alert('ReturnUrl is ' + rUrl);
        if( rUrl != null && rUrl.length > 0 ){
            window.location = rUrl;
        }
    }
}
//
// checks if user is authenticated then attempts to sign out
function TryLogout(){
    // verify auth status
    if( _loginControl.get_auth() ){  
        _loginStatusBar.innerHTML = 'Signing out...';
        _loginControl.LogoutUser();
    }else{
        OnLogout();
    }
}
//
// called when logout succeeds
function OnLogout(){
    // verify
    if( !_loginControl.get_auth() ){  
        _loginStatusBar.innerHTML = 'Welcome.  Please <a href="#" onclick="_registerControl.Close();_loginControl.Open();" title="Sign In">Sign In</a>.';
    }
}
//
// called when one of the forms needs opened
function OpenForm(link, openForm, closeForm){
    if( _prevFormTab != null ){
        link.parentNode.className = "";
    }
    link.parentNode.className = "selected";
    closeForm.Close();
    openForm.Open();
    _prevFormTab = link.parentNode;
}
var _prevFormTab = null;
//
// called to get link to profile
function GetUsernameLink(userName){
    var rtn = userName;
    if( _profilePathFormat != null && _profilePathFormat.length > 0 ){
        var url = "http://" + window.location.hostname + _profilePathFormat.replace("{0}", CS_Encode(userName));
        rtn = '<a href="' + url + '">' + userName + '</a>';
    }
    return rtn;
}

//
//define reference to the body object in IE
var iebody = (document.compatMode && document.compatMode != "BackCompat")? document.documentElement : document.body;
//
// Called to position the wrapper div fixed (if not IE7 or FF)
function PositionWrapper(){
    //define universal dsoc left point
    var dsocleft=document.all? iebody.scrollLeft : pageXOffset;
    //define universal dsoc top point
    var dsoctop=document.all? iebody.scrollTop : pageYOffset;

    //if the user is using IE 4+ or Firefox/ NS6+
    if (document.all||document.getElementById){
        _loginWrapper.style.left=parseInt(dsocleft)+0+"px";
        _loginWrapper.style.top=dsoctop+0+"px";
    }
}
//
// Checks the hash for LoginStatusControl state
function checkUrlHash() {
    var currentHash = window.location.hash;
    //alert('hash is ' + currentHash.indexOf('#sign-in'));
    if( currentHash.indexOf('sign-in') > 0 ){
        _registerControl.Close();
        _loginControl.Open();
    }else if( currentHash.indexOf('join') > 0 ){
        _loginControl.Close();  
        _registerControl.Open();  
    }else{
        _loginControl.Close();  
        _registerControl.Close();    
    }
}

function CS_Encode(str) {
    var SAFECHARS = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-_.!~*'()";
    var HEX = "0123456789ABCDEF";
    var encoded = "";
    for (var i = 0; i < str.length; i++) {
        var ch = str.charAt(i);
        if (ch == " ") {
            encoded += "+";
        } else if (SAFECHARS.indexOf(ch) != -1) {
            encoded += ch;
        } else if (ch == "'") {
            encoded += "%27";
        } else {
            var charCode = ch.charCodeAt(0);
            if (charCode > 255) {
                encoded += "+";
            } else {
                encoded += "%";
                encoded += HEX.charAt(charCode >> 4 & 15);
                encoded += HEX.charAt(charCode & 15);
            }
        }
    }
    return encoded;
}

//
// notify atlas script has loaded
if (typeof(Sys) !== 'undefined') Sys.Application.notifyScriptLoaded();