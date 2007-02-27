//------------------------------------
// Implementation of:
//  - Snip.Authentication service
//      - Login methods
//      - Registration methods
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

using System;
using System.Data.SqlClient;
using System.Text;
using System.Web;
using System.Web.Security;
using System.Configuration;
using System.Collections.Generic;
using System.Web.Services;
using System.Web.Services.Protocols;
using System.Security.Cryptography;
using System.Net.Mail;
using System.Web.Profile;
using System.Web.Script.Services;

namespace snip
{

    public class CheckRegistrationRequest
    {
        public string email;
        public string username;
    }

    public class CheckRegistrationResponse
    {
        public string salt;
        public bool email_available;
        public bool username_available;
    }

    public class RegistrationRequest
    {
        public string username;
        public string email;
        public string pwd;
        public string salt;
        public bool createCookie;
    }

    public class RegistrationResponse
    {
        public bool success;
        public string message;
        public bool email_sent;
    }


    public class SaltRequest
    {
        public string username;
    }

    public class SaltResponse
    {
        public string salt;
        public string challenge;
        public bool success;
    }

    public class LoginRequest
    {
        public string username;
        public string passwordHMAC;
        public bool createCookie;
    }

    public enum UserStatus
    {
        LoggedOut = 0,
        LoggedIn = 1,
        Locked = 2
    }
    public class LoginResponse
    {
        public UserStatus status;
        public string username;
    }

    /// <summary>
    /// Summary description for AuthenticationWebService
    /// </summary>
    [ScriptService]
    public class AuthenticationService : System.Web.Services.WebService
    {
        static SHA1CryptoServiceProvider shaProvider = new SHA1CryptoServiceProvider();

        public AuthenticationService()
        {
            //Uncomment the following line if using designed components 
            //InitializeComponent(); 
        }

        #region Registration methods

        [WebMethod]
        public CheckRegistrationResponse CheckRegistration(CheckRegistrationRequest request)
        {
            CheckRegistrationResponse response = new CheckRegistrationResponse();
            response.email_available = false;
            response.username_available = false;

            int totalRecords;
            // check username
            if (Membership.Provider.FindUsersByName(request.username, 0, 1, out totalRecords).Count == 0)
            {
                response.username_available = true;
            }
            // check email
            if (Membership.Provider.FindUsersByEmail(request.email, 0, 1, out totalRecords).Count == 0)
            {
                response.email_available = true;
            }

            // generate salt
            if (response.email_available && response.username_available)
            {
                response.salt = GenerateSalt();
            }

            return response;
        }

        [WebMethod]
        public RegistrationResponse RegisterUser(RegistrationRequest request)
        {
            RegistrationResponse response = new RegistrationResponse();
            response.success = false;

            MembershipCreateStatus status;
            // create user and auto-approve
            // NOTE: optionally require e-mail account validation
            // to activate / approve user
            MembershipUser user = Membership.Provider.CreateUser(
                request.username, request.pwd, request.email, 
                null, null, true, null, out status);
            if (status == MembershipCreateStatus.Success)
            {
                response.success = true;

                // validate / login users
                if (Membership.ValidateUser(request.username, request.pwd))
                {
                    // set authentication cookie
                    FormsAuthentication.SetAuthCookie(request.username, request.createCookie);

                    // Create an empty Profile for the newly created user
                    ProfileCommon p = (ProfileCommon)ProfileCommon.Create(request.username, true);
                    // store salt
                    p.Salt = request.salt;
                    p.Save();

                    try
                    {
                        // send email
                        SendRegistrationMail(request.email, request.username);
                        response.email_sent = true;
                    }
                    catch (Exception e)
                    {
                        response.email_sent = false;
                    }
                }
            }
            response.message = status.ToString();
            return response;
        }

        #endregion


        #region Login methods
        [WebMethod]
        public SaltResponse VerifyUserLogin(SaltRequest request)
        {
            SaltResponse response = new SaltResponse();
            response.success = false;

            // look up real username by email
            string userName = GetUsername(request.username);
            

            ProfileCommon p = ProfileBase.Create(userName) as ProfileCommon;
            if (p != null)
            {
                response.salt = p.Salt;
            }

            if (!String.IsNullOrEmpty(response.salt))
            {
                response.success = true;
                response.challenge = GetUserChallenge(request.username);
            }
            return response;
        }


        [WebMethod]
        public LoginResponse Login(LoginRequest request)
        {
            LoginResponse response = new LoginResponse();

            // look up real username by email
            string userName = GetUsername(request.username);

            // get users client-hashed password (b64 HMAC of salt and real password)
            string raw_pwd = GetPassword(userName);

            // HMAC user challenge w/ hashed password (have to do a str2bin on keys to match javascipt impl)
            HMACSHA1 shaHMAC = new HMACSHA1();
            string userChallenge = GetUserChallenge(request.username);
            if (!String.IsNullOrEmpty(userChallenge))
            {
                shaHMAC.Key = Encoding.BigEndianUnicode.GetBytes(userChallenge);
                byte[] chalPassHMAC = shaHMAC.ComputeHash(Encoding.BigEndianUnicode.GetBytes(raw_pwd));


                // check against value passed in
                bool passedChallenge = Convert.ToBase64String(chalPassHMAC).Equals(request.passwordHMAC);

                // first make sure challenge was passed
                if (passedChallenge)
                {
                    // user membership validate function
                    if (Membership.Provider.ValidateUser(userName, raw_pwd))
                    {
                        //FormsAuthentication.SetAuthCookie(userName, request.createCookie);

                        // create forms auth ticket with e-mail as userdata
                        // NOTE: this enables e-mail to be discovered by other apps with
                        // the same forms auth keys
                        FormsAuthenticationTicket ticket = new FormsAuthenticationTicket(1,
                          userName,
                          DateTime.Now,
                          DateTime.Now.AddMinutes(30),
                          request.createCookie,
                          request.username,
                          FormsAuthentication.FormsCookiePath);
                        // Encrypt the ticket.
                        string encTicket = FormsAuthentication.Encrypt(ticket);
                        // Create the cookie.
                        Context.Response.Cookies.Add(
                            new HttpCookie(FormsAuthentication.FormsCookieName, encTicket));

                        response.status = UserStatus.LoggedIn;
                        response.username = userName;
                    }
                    else
                    {
                        response.status = UserStatus.LoggedOut;
                    }
                }
                else
                {
                    // TODO: increment failed challenge count
                    // then lockout for specified period to prevent brute force attack
                    response.status = UserStatus.LoggedOut;
                }
            }
            else
            {
                // TODO: log invalid challenge
                response.status = UserStatus.LoggedOut;
            }

            return response;
        }

        [WebMethod]
        public LoginResponse Logout()
        {
            LoginResponse response = new LoginResponse();
            FormsAuthentication.SignOut();
            response.status = UserStatus.LoggedOut;
            return response;
        }

        #endregion

        #region helper methods

        /// <summary>
        /// Gets the username associated with a given email
        /// </summary>
        /// <param name="email">the e-mail</param>
        /// <returns>the username</returns>
        protected string GetUsername(string email)
        {
            int totalRecords = 0;
            string userName = string.Empty;
            MembershipUserCollection users = Membership.Provider.FindUsersByEmail(email, 0, 1, out totalRecords);
            if (totalRecords == 1)
            {
                foreach (MembershipUser user in users)
                {
                    userName = user.UserName;
                    break;
                }
            }
            return userName;
        }

        protected string GetPassword(string username)
        {
            string rtn = string.Empty;
            using (System.Data.SqlClient.SqlConnection conn = new SqlConnection(
                    ConfigurationManager.ConnectionStrings["SnipEngineConnection"].ConnectionString))
            {
                SqlCommand cmd = new SqlCommand("aspnet_Membership_GetPassword", conn);
                cmd.CommandType = System.Data.CommandType.StoredProcedure;
                cmd.Parameters.Add("@ApplicationName", System.Data.SqlDbType.NVarChar).Value = Membership.Provider.ApplicationName;
                cmd.Parameters.Add("@UserName", System.Data.SqlDbType.NVarChar).Value = username;
                cmd.Parameters.Add("@MaxInvalidPasswordAttempts", System.Data.SqlDbType.Int).Value = Membership.Provider.MaxInvalidPasswordAttempts;
                cmd.Parameters.Add("@PasswordAttemptWindow", System.Data.SqlDbType.Int).Value = Membership.Provider.PasswordAttemptWindow;
                cmd.Parameters.Add("@CurrentTimeUtc", System.Data.SqlDbType.DateTime).Value = DateTime.UtcNow;

                SqlParameter output = new SqlParameter("@ReturnValue", System.Data.SqlDbType.Int);
                output.Direction = System.Data.ParameterDirection.ReturnValue;

                cmd.Parameters.Add(output);
                conn.Open();
                using (SqlDataReader reader = cmd.ExecuteReader(System.Data.CommandBehavior.SingleRow))
                {
                    if (reader.Read())
                    {
                        rtn = reader.GetString(0);
                    }

                    reader.Close();
                }
                conn.Close();
            }
            return rtn;
        }

        protected string GenerateSalt()
        {
            byte[] salt = new byte[0x10];
            new RNGCryptoServiceProvider().GetBytes(salt);
            return Convert.ToBase64String(salt);
        }

        protected string GetUserChallenge(string username)
        {
            string key = string.Format("UserChallenge:{0}", username);
            string sChallenge = Context.Cache[key] as string;
            if (string.IsNullOrEmpty(sChallenge))
            {
                byte[] challenge = new byte[0x10];
                new RNGCryptoServiceProvider().GetBytes(challenge);
                sChallenge = Convert.ToBase64String(challenge);

                // add to cache for 2 minutes ... if response isn't recieved by then ... user needs to try again
                Context.Cache.Insert(key, sChallenge, null, DateTime.Now.AddMinutes(2), System.Web.Caching.Cache.NoSlidingExpiration);
            }

            return sChallenge;
        }


        protected void SendRegistrationMail(string email, string userName)
        {
            MailAddress emailAddress = new MailAddress(email);

            using (MailMessage message1 = new MailMessage("support@snipgen.com", email ))
            {
                StringBuilder bodyBuilder = new StringBuilder();
                bodyBuilder.AppendLine("*** NOTE: This e-mail is for demonstration only.  You recieved it because you created an account using the SnipGen AjaxLogin demo.  Your account will be deleted within 30 days. ***");
                bodyBuilder.AppendLine("Thanks for registering with Snipgen.com!");
                bodyBuilder.AppendLine(string.Format("The Screen Name you selected is {0}.", userName));
                bodyBuilder.AppendLine("If you need to change your password, use the change password form.");
                bodyBuilder.AppendLine("If you forget your password, you will have to reset it because you are the only person who knows your password.  It was encrypted prior to being stored and cannot be decrypted.");
                bodyBuilder.AppendLine("\nIf you have any questions, e-mail support@snipgen.com.");
                bodyBuilder.AppendLine("Regards,\nThe SnipGen Team.");

                message1.Body = bodyBuilder.ToString();
                message1.Subject = string.Format("{0} : Your new Snipgen account", userName);

                // TODO: look up mail server info from instance settings
                //Snip.Engine.Settings.Instances[1].AppSettings["smtpServer"];
                //Snip.Engine.Settings.Instances[1].AppSettings["smtpPort"];
                //Snip.Engine.Settings.Instances[1].AppSettings["smtpUser"];
                //Snip.Engine.Settings.Instances[1].AppSettings["smtpPassword"];

                SmtpClient client = new SmtpClient("localhost", 25);
                client.Credentials = new System.Net.NetworkCredential("no-reply@yourdomain.com", "a-good-password");
                client.Send(message1);

            }
        }
 


        #endregion
    }

}

