/**
 * ============================================================================
 * AppModals.jsx — Global Application Modals Container
 * Architecture: Modular App Orchestration | Little Princesses ERP
 * ============================================================================
 */

function AppModals({
  toast,
  setToast,
  loginModalOpen,
  setLoginModalOpen,
  usersModalOpen,
  setUsersModalOpen,
  currentUser,
  setCurrentUser,
  showToast
}) {
  const ToastComp = typeof Toast !== 'undefined' ? Toast : (window.Toast || null);
  const LoginComp = typeof LoginModal !== 'undefined' ? LoginModal : (window.LoginModal || null);
  const UsersComp = typeof UsersModal !== 'undefined' ? UsersModal : (window.UsersModal || null);

  return (
    <React.Fragment>
      {ToastComp && <ToastComp toast={toast} onClose={() => setToast(null)} />}

      {LoginComp && (
        <LoginComp 
          isOpen={loginModalOpen} 
          onClose={() => setLoginModalOpen(false)} 
          onLoginSuccess={(user) => {
            setCurrentUser(user);
            showToast(`مرحباً بك ${user.full_name || user.username} 👤`);
          }} 
          showToast={showToast} 
        />
      )}

      {UsersComp && (
        <UsersComp 
          isOpen={usersModalOpen} 
          onClose={() => setUsersModalOpen(false)} 
          showToast={showToast} 
          currentRole={currentUser?.role} 
        />
      )}
    </React.Fragment>
  );
}

window.AppModals = AppModals;
