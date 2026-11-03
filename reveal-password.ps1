param([switch]$Check)
$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
$stage = 'compileFailed'
try {
  Add-Type -AssemblyName System.Windows.Forms
  Add-Type -ReferencedAssemblies System.Windows.Forms -TypeDefinition @'
using System;
using System.Text;
using System.Runtime.InteropServices;
using System.Security.Principal;
using System.Windows.Forms;
public static class DbPasswordViewer {
  [StructLayout(LayoutKind.Sequential, CharSet=CharSet.Unicode)]
  struct UI { public int size; public IntPtr parent; public string message; public string caption; public IntPtr banner; }
  [DllImport("credui.dll", CharSet=CharSet.Unicode, ExactSpelling=true)]
  static extern int CredUIPromptForWindowsCredentialsW(ref UI ui, int error, ref uint package, IntPtr input, uint inputSize, out IntPtr output, out uint outputSize, ref bool save, int flags);
  [DllImport("credui.dll", CharSet=CharSet.Unicode, ExactSpelling=true, SetLastError=true)]
  static extern bool CredUnPackAuthenticationBufferW(int flags, IntPtr buffer, uint size, StringBuilder user, ref uint userSize, StringBuilder domain, ref uint domainSize, StringBuilder password, ref uint passwordSize);
  [DllImport("user32.dll")] static extern bool SetForegroundWindow(IntPtr window);
  [DllImport("advapi32.dll", CharSet=CharSet.Unicode, SetLastError=true)]
  static extern bool LogonUser(string user, string domain, string password, int type, int provider, out IntPtr token);
  [DllImport("kernel32.dll")] static extern bool CloseHandle(IntPtr token);
  // CredUI can return DOMAIN\user in the username buffer with an empty domain.
  // LogonUser needs these split; a bare local name must not use a null domain.
  public static string[] NormalizeAccount(string user, string domain, string machine) {
    int separator = user.IndexOf('\\');
    if (separator >= 0) {
      string embedded = user.Substring(0, separator);
      if (!String.IsNullOrEmpty(domain) && domain != "." && !String.Equals(domain, embedded, StringComparison.OrdinalIgnoreCase)) throw new ArgumentException("Account domain mismatch");
      return new string[] { user.Substring(separator + 1), embedded == "." ? machine : embedded };
    }
    if (user.IndexOf('@') >= 0) return new string[] { user, null };
    return new string[] { user, String.IsNullOrEmpty(domain) || domain == "." ? machine : domain };
  }
  public static int Unpack(IntPtr buffer, uint size, out StringBuilder user, out StringBuilder domain, out StringBuilder password) {
    uint userSize = 514, domainSize = 514, passwordSize = 1024;
    user = new StringBuilder((int)userSize); domain = new StringBuilder((int)domainSize); password = new StringBuilder((int)passwordSize);
    if (CredUnPackAuthenticationBufferW(1, buffer, size, user, ref userSize, domain, ref domainSize, password, ref passwordSize)) return 0;
    int error = Marshal.GetLastWin32Error();
    if (error != 122) return error;
    // Honor the lengths returned by Windows, while rejecting malformed buffers.
    if (userSize > 32768 || domainSize > 32768 || passwordSize > 32768) return 87;
    password.Clear();
    user = new StringBuilder((int)Math.Max(1, userSize)); domain = new StringBuilder((int)Math.Max(1, domainSize)); password = new StringBuilder((int)Math.Max(1, passwordSize));
    return CredUnPackAuthenticationBufferW(1, buffer, size, user, ref userSize, domain, ref domainSize, password, ref passwordSize) ? 0 : Marshal.GetLastWin32Error();
  }
  public static string Show(string alias) {
    using (var identity = WindowsIdentity.GetCurrent()) {
      var parts = identity.Name.Split('\\');
      if (parts.Length != 2 || !String.Equals(parts[0], Environment.MachineName, StringComparison.OrdinalIgnoreCase) || !Environment.UserInteractive) return "unsupported";
      IntPtr token;
      // A blank interactive logon must fail specifically with bad credentials.
      if (LogonUser(parts[1], parts[0], "", 2, 0, out token)) { CloseHandle(token); return "noPassword"; }
      int blankError = Marshal.GetLastWin32Error();
      if (blankError == 1327) return "noPassword";
      if (blankError != 1326) return "accountCheckFailed";
      // A visible topmost owner keeps the Windows dialog above the desktop app.
      using (var owner = new Form()) {
      owner.Text = "JoyinCode"; owner.Width = 1; owner.Height = 1;
      owner.StartPosition = FormStartPosition.CenterScreen; owner.ShowInTaskbar = false; owner.TopMost = true;
      owner.Show(); owner.Activate(); SetForegroundWindow(owner.Handle);
      var ui = new UI { size = Marshal.SizeOf(typeof(UI)), parent = owner.Handle, caption = "JoyinCode", message = "JoyinCode 正在尝试显示数据库密码，请输入您的 Windows 账户密码以允许此操作。" };
      StringBuilder username = null, domain = null, password = null;
      uint package = 0, outputSize;
      IntPtr output = IntPtr.Zero;
      bool save = false;
      int prompt = CredUIPromptForWindowsCredentialsW(ref ui, 0, ref package, IntPtr.Zero, 0, out output, out outputSize, ref save, 0x200);
      try {
      if (prompt == 1223) return "cancelled";
      if (prompt != 0) return "promptFailed";
        int unpackError = Unpack(output, outputSize, out username, out domain, out password);
        if (unpackError != 0) return "unpack:" + unpackError;
        if (password.Length == 0) return "emptyCredential";
        string[] account;
        try { account = NormalizeAccount(username.ToString(), domain.ToString(), Environment.MachineName); }
        catch (ArgumentException) { return "identityMismatch"; }
        try {
          var selected = account[1] == null ? new NTAccount(account[0]) : new NTAccount(account[1], account[0]);
          if (!identity.User.Equals(selected.Translate(typeof(SecurityIdentifier)))) return "identityMismatch";
        } catch (IdentityNotMappedException) { return "identityMismatch"; }
        if (!LogonUser(account[0], account[1], password.ToString(), 2, 0, out token)) return "logon:" + Marshal.GetLastWin32Error();
        try { using (var verified = new WindowsIdentity(token)) { if (!identity.User.Equals(verified.User)) return "identityMismatch"; } }
        finally { CloseHandle(token); }
      } finally {
        if (password != null) password.Clear();
        if (output != IntPtr.Zero) { for (uint i = 0; i < outputSize; i++) Marshal.WriteByte(output, (int)i, 0); Marshal.FreeCoTaskMem(output); }
        owner.Close();
      }
      return "verified";
      }
    }
  }
}
'@
  if ($Check) { [Console]::Out.Write('ready'); exit 0 }
  $stage = 'nativeFailed'
  $payload = [Console]::In.ReadLine() | ConvertFrom-Json
  [Console]::Out.Write([DbPasswordViewer]::Show($payload.alias))
} catch { [Console]::Out.Write($stage) }
