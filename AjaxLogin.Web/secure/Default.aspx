<%@ Page Language="C#" MasterPageFile="~/MasterPage.master" Title="You've reached a secure area at SnipGen.com" %>
<asp:Content ID="Content1" ContentPlaceHolderID="CenterContent" Runat="Server">

    <h2>
    Hello <%= Page.User.Identity.Name %>.
    </h2>
    <p>Congratulations, on the successful use of the AJAX Login control.</p>
    <a href="../">&#171;&nbsp;Okay, I'm done here.</a>
    
</asp:Content>
