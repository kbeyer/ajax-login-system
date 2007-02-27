<%@ Control Language="C#" ClassName="LoginStatusControl" %>

<asp:ScriptManagerProxy ID="SMP" runat="Server" />

<div id="login-status-wrapper">
    <div id="login-status-bar">
        Welcome.  Please <a href="#sign-in" onclick="_registerControl.Close();_loginControl.Open();" title="Sign In">Sign In</a>.</div>
    <div id="register_control" style="display: none;" onkeypress="return _registerControl.KeyPressed(event, 'RegisterButton');">
        <div class="login-form">
          <div class="form-title"><div class="float-left">Join Community</div><div class="float-right"><small>(<a href="#" onclick="_registerControl.Close();">never mind</a>)</small></div></div>
          <div class="form-content">            
            <label for="Email-R">Your Email:</label><br />
            <input type="text" id="Email-R" name="Email-R" onfocus="this.className='form-focus'" onblur="this.className='form-blur'" /><br />
            <label for="UserName-R">Screen Name:</label><br />
            <input type="text" id="UserName-R" name="UserName-R" onfocus="this.className='form-focus'" onblur="this.className='form-blur'" /><br />
            <label for="Password-R">Your Password:</label><br />
            <input type="password" id="Password-R" name="Password-R" value="" onfocus="this.className='form-focus'" onblur="this.className='form-blur'" /><br />
            <label for="PasswordCheck-R">Re-enter Password:</label><br />
            <input type="password" id="PasswordCheck-R" name="PasswordCheck-R" value="" onfocus="this.className='form-focus'" onblur="this.className='form-blur'" /><br />
            <input type="checkbox" id="RememberMe-R" name="RememberMe-R" class="checkbox-middle" />
            <label for="RememberMe-R">Remember me.</label><br />
            <input type="button" class="button" value="Sign In" id="RegisterButton" name="RegisterButton" onclick="javascript:RegisterClicked();" /><br />
            <label id="Status-R" class="form-status"></label>
          </div>
        </div>
    </div>
    <div id="login_control" style="display: none;" onkeypress="return _loginControl.KeyPressed(event, 'LoginButton');">
        <div class="login-form">
          <div class="form-title"><div class="float-left">Sign In</div><div class="float-right"><small>(<a href="#" onclick="_loginControl.Close();">never mind</a>)</small></div></div>
          <div class="form-content">
            <label for="UserName-L">Your Email:</label><br />
            <input type="text" id="UserName-L" name="UserName-L" onfocus="this.className='form-focus'" onblur="this.className='form-blur'" /><br />
            <label for="Password-L">Your Password:</label><br />
            <input type="password" id="Password-L" name="Password-L" value="" onfocus="this.className='form-focus'" onblur="this.className='form-blur'" /><br />
            <input type="checkbox" id="RememberMe-L" name="RememberMe-L" class="checkbox-middle" />
            <label for="RememberMe-L">Remember me.</label><br />    
            <input type="button" class="button" value="Sign In" id="LoginButton" name="LoginButton" onclick="javascript:LoginClicked();" /><br />
            <div id="Status-L" class="form-status bad"></div>
            <span class="login-createuser">
              <a href="#join" onclick="_loginControl.Close(); _registerControl.Open();" title="Create New Account">New Account</a>
            </span><br />
            <span class="login-recoverpassword">
              <a href="#remind-me" onclick="alert('Oops, not yet implemented.');" title="Password Reminder">Password Reminder</a>
            </span><br />
          </div>
        </div>
    </div>
    <input type="hidden" value="<%= Page.User.Identity.Name %>" id="server-username" /> 
    <input type="hidden" value="<%= Request.IsAuthenticated %>" id="server-auth-status" /> 
</div>

<script runat="server">

    protected override void OnLoad(EventArgs e)
    {
        base.OnLoad(e);
        this.ConfigureChildControls();
    }
    
    protected void ConfigureChildControls()
    {
        if (this.SMP != null)
        {
            string themeLocation = "~/SnipThemes/default";
            string authServicePath = base.ResolveUrl("~/AuthenticationService.asmx");
            
            ServiceReference authServiceReference = new ServiceReference();
            authServiceReference.Path = authServicePath;
            this.SMP.Services.Add(authServiceReference);

            ScriptReference shaReference = new ScriptReference();
            shaReference.Path = base.ResolveUrl(themeLocation + "/scripts/SHA1.js");
            this.SMP.Scripts.Add(shaReference);

            ScriptReference snipControlsReference = new ScriptReference();
            snipControlsReference.Path = base.ResolveUrl(themeLocation + "/scripts/SnipControls.js");
            this.SMP.Scripts.Add(snipControlsReference);

            ScriptReference skinScriptReference = new ScriptReference();
            skinScriptReference.Path = base.ResolveUrl(themeLocation + "/skins/Skin-LoginStatusControl.js");
            this.SMP.Scripts.Add(skinScriptReference);
        }
    }

</script>