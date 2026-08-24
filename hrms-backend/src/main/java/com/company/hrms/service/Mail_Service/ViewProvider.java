package com.company.hrms.service.Mail_Service;

public class ViewProvider 
{
    static String htmlMailTamplate() 
    {
        return """
                <!DOCTYPE html>
                <html lang="en">

                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>Welcome to RapidHire</title>
                </head>

                <body style="margin:0; padding:0; background-color:#f4f6f8; font-family:Arial, Helvetica, sans-serif;">

                    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f4f6f8; padding:40px 0;">
                        <tr>
                            <td align="center">

                                <!-- Main Container -->
                                <table width="600" cellpadding="0" cellspacing="0" border="0"
                                    style="background-color:#ffffff; border-radius:10px; overflow:hidden;">

                                    <!-- Header -->
                                    <tr>
                                        <td style="background-color:#1f4e79; padding:25px 30px; text-align:center;">
                                            <h1 style="color:#ffffff; margin:0; font-size:26px;">
                                                Welcome to RapidHire!
                                            </h1>
                                        </td>
                                    </tr>

                                    <!-- Content -->
                                    <tr>
                                        <td style="padding:35px 40px; color:#333333;">

                                            <p style="font-size:16px; margin-top:0;">
                                                Dear <strong>{{employeeName}}</strong>,
                                            </p>

                                            <p style="font-size:15px; line-height:1.6;">
                                                Welcome to RapidHire! We are pleased to have you as part of our
                                                organization.
                                            </p>

                                            <p style="font-size:15px; line-height:1.6;">
                                                Your employee account has been successfully created in the
                                                HRMS Payroll system. Please find your login credentials below:
                                            </p>

                                            <!-- Credentials Box -->
                                            <table width="100%" cellpadding="0" cellspacing="0" border="0"
                                                style="background-color:#f5f8fb; border:1px solid #d9e2ec; border-radius:8px; margin:25px 0;">

                                                <tr>
                                                    <td style="padding:20px 25px;">

                                                        <p style="margin:0 0 12px 0; font-size:15px;">
                                                            <strong>Employee ID:</strong>
                                                            <span style="color:#1f4e79;">
                                                                {{employeeId}}
                                                            </span>
                                                        </p>

                                                        <p style="margin:0; font-size:15px;">
                                                            <strong>Password:</strong>
                                                            <span style="color:#1f4e79;">
                                                                {{password}}
                                                            </span>
                                                        </p>

                                                    </td>
                                                </tr>
                                            </table>

                                            <!-- Login Button -->
                                            <div style="text-align:center; margin:30px 0;">

                                                <a href="https://hrms-payroll-mocha.vercel.app/auth/login" style="display:inline-block;
                                                      background-color:#1f4e79;
                                                      color:#ffffff;
                                                      text-decoration:none;
                                                      padding:13px 28px;
                                                      border-radius:6px;
                                                      font-size:15px;
                                                      font-weight:bold;">
                                                    Login to HRMS Portal
                                                </a>

                                            </div>

                                            <p style="font-size:14px; line-height:1.6; color:#555555;">
                                                For security reasons, please do not share your login credentials
                                                with anyone. We recommend changing your password after your
                                                first login.
                                            </p>

                                            <p style="font-size:15px; line-height:1.6;">
                                                If you face any issues while logging in, please contact the
                                                HR/IT support team.
                                            </p>

                                        </td>
                                    </tr>

                                    <!-- Signature / Footer -->
                                    <tr>
                                        <td style="padding:25px 40px 20px 40px;">

                                            <p style="margin:-40px 0 4px 0;
                                  font-size:15px;
                                  font-weight:bold;
                                  font-style:italic;
                                  color:#222222;">
                                                Thanks &amp; Warm Regards
                                            </p>

                                            <p style="margin:0 0 12px 0;
                                  font-size:14px;
                                  font-weight:bold;
                                  color:#777777;">
                                                Human Resource Department
                                            </p>

                                            <img src="https://therapidhire.com/images/logo.png" alt="TheRapidHire" width="100" style="display:block;
                                    width:200px;
                                    max-width:100%;
                                    height:auto;

                                    border:0;">

                                        </td>
                                    </tr>

                                    <!-- Automated Email Notice -->
                                    <tr>
                                        <td style="background-color:#f8f9fa;
                               padding:12px 30px;
                               text-align:center;">

                                            <p style="margin:0;
                                  font-size:11px;
                                  color:#888888;">
                                                This is an automated email from the RapidHire HRMS Payroll System.
                                                Please do not reply to this email.
                                            </p>

                                        </td>
                                    </tr>

                                </table>

                            </td>
                        </tr>
                    </table>

                </body>

                </html>
                """;
    }
}

