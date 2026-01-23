<script>
  import { onMount } from 'svelte';
  import { API_BASE_URL } from '../config.js';
  import { apiFetch } from '../api/api.js';
  import { avatar } from '../stores/avatar.js';

  let userData = {
    username: '',
    email: '',
    role: ''
  };

  let profileData = {
    phone_number: '',
    vk_link: '',
    telegram_link: '',
    bio: '',
    avatar: '/avatar.png'
  };

  let profileSettings = {
    theme: 'light',
    show_test_answers: true
  };

  let username = '';
  let phoneInfo = '';

  let vkLinkRest = '';
  let telegramLinkRest = '';

  let aboutMe = '';

  let globalError = "";
  let personalInfoError = "";
  let personalInfoSuccess = "";
  let aboutMeError = "";
  let aboutMeSuccess = "";
  let avatarError = "";
  let avatarSuccess = "";

  let fileInputRef;
  
  let isAvatarUploading = false;

  let newEmail = '';
  let emailPassword = '';
  let emailChangeError = '';
  let emailChangeSuccess = '';
  let emailConfirmCode = '';
  let showEmailConfirmation = false;
  
  let oldPassword = '';
  let newPassword = '';
  let confirmPassword = '';
  let passwordChangeError = '';
  let passwordChangeSuccess = '';
  let passwordConfirmCode = '';
  let showPasswordConfirmation = false;

    async function requestEmailChange() {
    emailChangeError = "";
    emailChangeSuccess = "";
    
    if (!newEmail || !newEmail.includes('@') || !newEmail.includes('.')) {
      emailChangeError = "Пожалуйста, введите корректный email адрес";
      return;
    }
    
    if (!emailPassword) {
      emailChangeError = "Пожалуйста, введите пароль";
      return;
    }
    
    try {
      const payload = {
        new_email: newEmail,
        password: emailPassword
      };
      
      const response = await apiFetch(`${API_BASE_URL}/auth/email/change/request/`, {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      
      if (response.ok) {
        const data = await response.json();
        emailChangeSuccess = data.message || "Код подтверждения отправлен на новый email.";
        showEmailConfirmation = true;
        emailPassword = '';
      } else {
        const errorData = await response.json();
        
        if (errorData.new_email) {
          emailChangeError = errorData.new_email[0];
        } else if (errorData.password) {
          emailChangeError = errorData.password[0];
        } else if (errorData.detail) {
          emailChangeError = errorData.detail;
        } else {
          emailChangeError = "Ошибка запроса на смену почты";
        }
      }
    } catch (err) {
      console.error(err);
      emailChangeError = "Ошибка соединения при отправке запроса на смену почты";
    }
  }
  
  async function confirmEmailChange() {
    emailChangeError = "";
    emailChangeSuccess = "";
    
    if (!emailConfirmCode) {
      emailChangeError = "Пожалуйста, введите код подтверждения";
      return;
    }
    
    try {
      const payload = {
        code: emailConfirmCode
      };
      
      const response = await apiFetch(`${API_BASE_URL}/auth/email/change/confirm/`, {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      
      if (response.ok) {
        const data = await response.json();
        emailChangeSuccess = data.message || "Email успешно изменён.";
        showEmailConfirmation = false;
        emailConfirmCode = '';
        newEmail = '';
        await fetchProfile();
      } else {
        const errorData = await response.json();
        if (errorData.non_field_errors) {
          emailChangeError = errorData.non_field_errors[0];
        } else if (errorData.detail) {
          emailChangeError = errorData.detail;
        } else {
          emailChangeError = "Ошибка подтверждения смены почты";
        }
      }
    } catch (err) {
      console.error(err);
      emailChangeError = "Ошибка соединения при подтверждении смены почты";
    }
  }
  
  async function requestPasswordChange() {
    passwordChangeError = "";
    passwordChangeSuccess = "";
    
    if (!oldPassword) {
      passwordChangeError = "Пожалуйста, введите старый пароль";
      return;
    }
    
    if (!newPassword) {
      passwordChangeError = "Пожалуйста, введите новый пароль";
      return;
    }
    
    if (!confirmPassword) {
      passwordChangeError = "Пожалуйста, повторите новый пароль";
      return;
    }
    
    if (newPassword !== confirmPassword) {
      passwordChangeError = "Новые пароли не совпадают";
      return;
    }
    
    try {
      const payload = {
        current_password: oldPassword,
        new_password: newPassword
      };
      
      const response = await apiFetch(`${API_BASE_URL}/auth/password/change/request/`, {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      
      if (response.ok) {
        const data = await response.json();
        passwordChangeSuccess = data.message || "Код подтверждения отправлен на вашу почту.";
        showPasswordConfirmation = true;
        oldPassword = '';
        newPassword = '';
        confirmPassword = '';
      } else {
        const errorData = await response.json();
        if (errorData.current_password) {
          passwordChangeError = errorData.current_password[0];
        } else if (errorData.new_password) {
          passwordChangeError = errorData.new_password[0];
        } else if (errorData.detail) {
          passwordChangeError = errorData.detail;
        } else {
          passwordChangeError = "Ошибка запроса на смену пароля";
        }
      }
    } catch (err) {
      console.error(err);
      passwordChangeError = "Ошибка соединения при отправке запроса на смену пароля";
    }
  }
  
  async function confirmPasswordChange() {
    passwordChangeError = "";
    passwordChangeSuccess = "";
    
    if (!passwordConfirmCode) {
      passwordChangeError = "Пожалуйста, введите код подтверждения";
      return;
    }
    
    try {
      const payload = {
        code: passwordConfirmCode
      };
      
      const response = await apiFetch(`${API_BASE_URL}/auth/password/change/confirm/`, {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      
      if (response.ok) {
        const data = await response.json();
        passwordChangeSuccess = data.message || "Пароль успешно изменён.";
        showPasswordConfirmation = false;
        passwordConfirmCode = '';
      } else {
        const errorData = await response.json();
        if (errorData.non_field_errors) {
          passwordChangeError = errorData.non_field_errors[0];
        } else if (errorData.detail) {
          passwordChangeError = errorData.detail;
        } else {
          passwordChangeError = "Ошибка подтверждения смены пароля";
        }
      }
    } catch (err) {
      console.error(err);
      passwordChangeError = "Ошибка соединения при подтверждении смены пароля";
    }
  }

  async function fetchUser() {
    try {
      const response = await apiFetch(`${API_BASE_URL}/auth/user/`);
      if (response.ok) {
        userData = await response.json();
        username = userData.username;
      } else {
        globalError = "Ошибка загрузки данных пользователя";
      }
    } catch (err) {
      console.error(err);
      globalError = "Ошибка соединения при загрузке пользователя";
    }
  }

  async function fetchProfile() {
    try {
      const response = await apiFetch(`${API_BASE_URL}/profile/`);
      if (response.ok) {
        profileData = await response.json();

        profileData.avatar = profileData.avatar || '/avatar.png';
        avatar.set(profileData.avatar);

        phoneInfo = profileData.phone_number || '';

        vkLinkRest = profileData.vk_link && profileData.vk_link.startsWith('https://')
          ? profileData.vk_link.slice(8)
          : '';
        telegramLinkRest = profileData.telegram_link && profileData.telegram_link.startsWith('https://')
          ? profileData.telegram_link.slice(8)
          : '';
        aboutMe = profileData.bio || '';
      } else {
        globalError = "Ошибка загрузки данных профиля";
      }
    } catch (err) {
      console.error(err);
      globalError = "Ошибка соединения при загрузке профиля";
    }
  }

  async function fetchSettings() {
    try {
      const response = await apiFetch(`${API_BASE_URL}/profile/settings`);
      if (response.ok) {
        profileSettings = await response.json();
      } else {
        globalError = "Ошибка загрузки настроек профиля";
      }
    } catch (err) {
      console.error(err);
      globalError = "Ошибка соединения при загрузке настроек";
    }
  }

  async function savePersonalInfo() {
    personalInfoError = "";
    personalInfoSuccess = "";
    try {
      const payload = {
        username,
        phone_number: phoneInfo,
        vk_link: vkLinkRest ? `https://${vkLinkRest}` : '',
        telegram_link: telegramLinkRest ? `https://${telegramLinkRest}` : ''
      };
      const response = await apiFetch(`${API_BASE_URL}/profile/`, {
        method: 'PATCH',
        body: JSON.stringify(payload)
      });
      if (response.ok) {
        profileData = await response.json();
        personalInfoSuccess = "Персональная информация успешно сохранена";
      } else {
        const data = await response.json();
        personalInfoError = data.detail || "Ошибка сохранения персональной информации";
      }
    } catch (err) {
      console.error(err);
      personalInfoError = "Ошибка соединения при сохранении персональной информации";
    }
  }

  async function saveAboutMe() {
    aboutMeError = "";
    aboutMeSuccess = "";
    try {
      const payload = { bio: aboutMe };
      const response = await apiFetch(`${API_BASE_URL}/profile/`, {
        method: 'PATCH',
        body: JSON.stringify(payload)
      });
      if (response.ok) {
        profileData = await response.json();
        aboutMeSuccess = "Информация 'О себе' успешно сохранена";
      } else {
        const data = await response.json();
        aboutMeError = data.detail || "Ошибка сохранения информации";
      }
    } catch (err) {
      console.error(err);
      aboutMeError = "Ошибка соединения при сохранении информации";
    }
  }

  async function updateSettings(newSettings) {
    try {
      const response = await apiFetch(`${API_BASE_URL}/profile/settings`, {
        method: 'PATCH',
        body: JSON.stringify(newSettings)
      });
      if (response.ok) {
        profileSettings = await response.json();
      } else {
        const data = await response.json();
        globalError = data.detail || "Ошибка обновления настроек";
      }
    } catch (err) {
      console.error(err);
      globalError = "Ошибка соединения при обновлении настроек";
    }
  }

  function toggleTheme() {
    const newTheme = profileSettings.theme === 'light' ? 'dark' : 'light';
    profileSettings.theme = newTheme;
    updateSettings({ theme: newTheme });
  }

  function toggleShowTestAnswers() {
    const newValue = !profileSettings.show_test_answers;
    profileSettings.show_test_answers = newValue;
    updateSettings({ show_test_answers: newValue });
  }

  function openFileDialog() {
    if (fileInputRef) {
      fileInputRef.click();
    }
  }

  async function uploadAvatar(event) {
    avatarError = "";
    avatarSuccess = "";
    
    const file = event.target.files[0];
    if (!file) return;
    
    if (!file.type.startsWith('image/')) {
      avatarError = "Пожалуйста, выберите изображение";
      return;
    }
    
    const maxSize = 5 * 1024 * 1024; // 5 МБ
    if (file.size > maxSize) {
      avatarError = "Размер файла не должен превышать 5 МБ";
      return;
    }
    
    isAvatarUploading = true;
    
    try {
      const formData = new FormData();
      formData.append('avatar', file);
      
      const token = await getCsrfToken();
      const response = await fetch(`${API_BASE_URL}/profile/avatar`, {
        method: 'PUT',
        headers: {
          'X-CSRFTOKEN': token,
          'accept': 'application/json'
        },
        credentials: 'include',
        body: formData
      });
      
      if (response.ok) {
        try {
          const result = await response.json();
          profileData.avatar = `${result.avatar || '/avatar.png'}`;
          avatar.set(profileData.avatar);
          avatarSuccess = "Аватар успешно обновлен";
        } catch (e) {
          avatarError = "Ошибка сервера при загрузке аватара";
        }
      } else {
        try {
          const data = await response.json();
          avatarError = data.detail || "Ошибка загрузки аватара";
        } catch (e) {
          avatarError = "Ошибка сервера при загрузке аватара";
        }
      }
    } catch (err) {
      console.error(err);
      avatarError = "Ошибка соединения при загрузке аватара";
    } finally {
      isAvatarUploading = false;
      if (fileInputRef) {
        fileInputRef.value = '';
      }
    }
  }

  async function deleteAvatar() {
    if (!confirm("Вы уверены, что хотите удалить аватар?")) {
      return;
    }
    
    avatarError = "";
    avatarSuccess = "";
    isAvatarUploading = true;
    
    try {
      const response = await apiFetch(`${API_BASE_URL}/profile/avatar`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        profileData.avatar = '/avatar.png';
        avatar.set(profileData.avatar);
        avatarSuccess = "Аватар успешно удален";
      } else {
        try {
          const data = await response.json();
          avatarError = data.detail || "Ошибка удаления аватара";
        } catch (e) {
          avatarError = "Ошибка сервера при удалении аватара";
        }
      }
    } catch (err) {
      console.error(err);
      avatarError = "Ошибка соединения при удалении аватара";
    } finally {
      isAvatarUploading = false;
    }
  }

  async function getCsrfToken() {
    const { getCsrfToken } = await import('../api/csrf.js');
    return getCsrfToken();
  }

  onMount(async () => {
    await fetchUser();
    await fetchProfile();
    await fetchSettings();
  });
</script>

<svelte:head>
  <title>Настройки — Kei</title>
  <meta name="og:title" content="Настройки — Kei" />
  <meta name="twitter:title" content="Настройки — Kei" />
  <meta name="description" content="Личные данные, безопасность и предпочтения отображения." />
</svelte:head>

<style>
main {
  max-width: var(--spacing-main-max-width);
  width: var(--spacing-main-width);
  margin: var(--spacing-main-margin-top) auto 0;
  padding: var(--spacing-main-padding);
  box-sizing: border-box;
}

.profile-block {
  position: relative;
  margin-bottom: var(--spacing-profile-block-margin-bottom);
  border-radius: var(--spacing-profile-block-border-radius);
  overflow: hidden;
  background-color: var(--color-profile-block-bg);
  box-shadow: 0 4px 12px var(--color-profile-block-shadow);
}

.profile-content {
  background-color: var(--color-profile-content-bg);
  padding: var(--spacing-profile-content-padding);
}

.profile-banner {
  position: relative;
  width: 100%;
  height: var(--spacing-profile-banner-height);
  background-size: var(--profile-banner-bg-size);
  background-position: var(--profile-banner-bg-position);
  background-repeat: var(--profile-banner-bg-repeat);
  border-radius: var(--spacing-profile-banner-border-radius);
  overflow: hidden;
  padding-bottom: var(--spacing-profile-banner-padding-bottom);
  --big-size: var(--spacing-profile-banner-after-size);
  --small-size: var(--spacing-profile-banner-before-size);
  --offsetY: var(--spacing-profile-banner-offset-y);
}

.profile-banner::before,
.profile-banner::after {
  content: "";
  position: absolute;
  border-radius: 50%;
}

.profile-banner::before {
  content: "";
  position: absolute;
  width: var(--small-size);
  height: var(--small-size);
  background-color: var(--color-profile-banner-bg-before);
  border-radius: 50%;
  transform: translateY(var(--offsetY));
  top: calc(50% - (var(--small-size) / 2));
  right: calc(4% + var(--big-size) - (var(--small-size) / 3));
  z-index: var(--profile-banner-z-index);
}

.profile-banner::after {
  content: "";
  position: absolute;
  width: var(--big-size);
  height: var(--big-size);
  background-color: var(--color-profile-banner-bg-after);
  border-radius: 50%;
  transform: translateY(var(--offsetY));
  top: calc(50% - (var(--big-size) / 2));
  right: 8%;
  z-index: var(--profile-banner-z-index);
}


.avatar {
  position: absolute;
  top: var(--spacing-avatar-top-profile);
  left: var(--spacing-avatar-left-profile);
  width: var(--spacing-avatar-size-profile);
  height: var(--spacing-avatar-size-profile);
  border: var(--spacing-avatar-border-width-profile) solid var(--color-avatar-border-profile);
  border-radius: var(--spacing-avatar-border-radius-profile);
  background: var(--color-avatar-bg-profile);
  background-position: center;
  background-repeat: no-repeat;
  background-size: cover;
  z-index: var(--avatar-z-index-profile);
  box-shadow: 0 2px var(--spacing-avatar-shadow-blur-profile) var(--color-avatar-shadow-profile);
}

  .avatar-container:hover .avatar {
    filter: brightness(80%);
  }

  .avatar-overlay {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: var(--color-avatar-overlay-bg);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    color: var(--color-avatar-overlay-text);
    opacity: 0;
    transition: var(--avatar-overlay-opacity-transition);
  }

  .avatar-container:hover .avatar-overlay {
    opacity: 1;
  }

  .avatar-overlay.loading {
    opacity: 1;
    background-color: var(--color-avatar-overlay-loading-bg);
  }

  .avatar-overlay.loading i {
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }

  .avatar-delete {
    position: absolute;
    bottom: 0;
    right: 0;
    background-color: var(--color-avatar-delete-bg);
    color: var(--color-avatar-delete-text);
    border: none;
    border-radius: 50%;
    width: var(--spacing-avatar-delete-size);
    height: var(--spacing-avatar-delete-size);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    opacity: 0;
    transition: var(--avatar-delete-opacity-transition);
  }

  .avatar-container:hover .avatar-delete {
    opacity: 1;
  }

  .avatar-delete:hover {
    background-color: var(--color-avatar-delete-bg-hover);
  }

  .avatar-message {
    margin-top: var(--spacing-avatar-message-margin-top);
    text-align: center;
    font-size: 0.9em;
  }

.profile-info-cols {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: flex-start;
  gap: var(--spacing-profile-info-cols-gap);
}

.profile-info-cols .col {
  flex: 1 1 200px;
  padding: var(--spacing-profile-info-cols-col-padding);
  display: flex;
  flex-direction: column;
}

.user-col .user-name {
  font-size: clamp(var(--spacing-profile-info-name-font-size-min), 4vw, var(--spacing-profile-info-name-font-size-max));
  font-weight: 900;
  color: var(--color-profile-info-name);
  word-wrap: break-word;
}

.user-col .user-role {
  font-size: clamp(0.8rem, 3vw, 1rem);
  font-weight: bold;
  color: var(--color-profile-info-name);
  margin-top: var(--spacing-profile-info-role-margin-top);
}

.phone-col .info-label,
.email-col .info-label {
  font-size: clamp(0.8rem, 3vw, 1rem);
  font-weight: bold;
  color: var(--color-profile-info-label);
  margin-bottom: var(--spacing-profile-info-label-margin-bottom);
}

.phone-col .phone,
.email-col .email {
  display: flex;
  align-items: center;
  font-weight: bold;
  font-size: clamp(0.8rem, 3vw, 1rem);
  word-break: break-word;
}

.phone-col .phone span,
.email-col .email span {
  color: var(--color-profile-info-value);
}

.phone-col .phone i,
.email-col .email i {
  margin-right: var(--spacing-profile-info-icon-margin-right);
  flex-shrink: 0;
}

.block {
  background-color: var(--color-block-bg);
  border: 1px solid var(--color-block-border);
  border-radius: var(--spacing-block-border-radius);
  padding: var(--spacing-block-padding);
  margin-bottom: var(--spacing-block-margin-bottom);
  box-shadow: 0 2px var(--spacing-block-shadow-blur) var(--color-block-shadow);
  transition: var(--block-shadow-transition);
}

.block:hover {
  box-shadow: 0 4px 15px var(--color-block-shadow-hover);
}

.block h2 {
  margin: 0 0 var(--spacing-block-title-margin-bottom) 0;
  color: var(--color-block-title);
  font-size: clamp(var(--block-title-font-size-min), 3vw, var(--block-title-font-size-max));
  font-family: var(--font-family-primary);
  font-weight: var(--font-weight-bold);
}

.btn-container {
  display: flex;
  justify-content: center;
  margin-top: var(--spacing-btn-container-margin-top);
}

.grid-2x2 {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(30vw, 1fr));
  gap: var(--spacing-grid-gap-row) var(--spacing-grid-gap-col);
  max-width: 100%;
}

label {
  display: block;
  margin-bottom: var(--spacing-label-margin-bottom);
  color: var(--color-label);
  font-size: var(--label-font-size);
  font-family: var(--font-family-primary);
}

input,
textarea {
  width: 100%;
  padding: var(--spacing-input-padding);
  font-size: var(--input-font-size);
  border: 1px solid var(--color-input-border);
  border-radius: var(--spacing-input-border-radius);
  background-color: var(--color-input-bg);
  box-sizing: border-box;
  font-family: var(--font-family-primary);
  transition: var(--input-transition);
}

input:focus,
textarea:focus {
  outline: none;
  border-color: var(--color-input-focus-border);
  box-shadow: 0 0 0 2px var(--color-input-focus-shadow);
}

textarea {
  resize: none;
  height: var(--spacing-textarea-height);
}

.form-group {
  margin-bottom: var(--spacing-form-group-margin-bottom);
  flex: 1 1 250px;
}

.flex-row {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-flex-row-gap);
}

.save-btn {
  background: linear-gradient(to right, var(--color-save-btn-gradient-start) 0%, var(--color-save-btn-gradient-end) 100%);
  color: var(--color-save-btn-text);
  padding: var(--spacing-save-btn-padding);
  min-width: var(--spacing-save-btn-min-width);
  border: none;
  border-radius: var(--spacing-save-btn-border-radius);
  cursor: pointer;
  font-family: var(--font-family-primary);
  font-weight: var(--font-weight-bold);
  font-size: var(--save-btn-font-size);
  box-shadow: 0px 3px 13px rgba(0, 0, 0, 0.161);
  transition: var(--save-btn-transition);
  text-align: center;
  display: inline-block;
}

.save-btn:hover {
  background: linear-gradient(to right, var(--color-save-btn-gradient-hover-start) 0%, var(--color-save-btn-gradient-hover-end) 100%);
  transform: translateY(-2px);
}

.save-btn:active {
  transform: translateY(1px);
}

.settings-item {
  margin-bottom: var(--spacing-settings-item-margin-bottom);
  display: flex;
  align-items: center;
  flex-wrap: wrap;
}

.switch-label {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-settings-label-gap);
  font-size: var(--label-font-size);
  color: var(--color-settings-label);
  cursor: pointer;
  font-weight: var(--font-weight-bold);
  padding: 0.5rem 0;
}

.switch-label input {
  opacity: 0;
  width: 0;
  height: 0;
}

.switch-slider {
  position: relative;
  display: inline-block;
  width: var(--spacing-switch-width);
  height: var(--spacing-switch-height);
  background-color: var(--color-switch-bg);
  border-radius: 24px;
  transition: var(--switch-transition);
}

.switch-slider:before {
  position: absolute;
  content: "";
  height: var(--spacing-switch-thumb-size);
  width: var(--spacing-switch-thumb-size);
  left: var(--spacing-switch-thumb-offset);
  top: var(--spacing-switch-thumb-offset);
  background-color: var(--color-switch-thumb);
  border-radius: 50%;
  transition: var(--switch-transition);
}

.switch-label input:checked + .switch-slider {
  background-color: var(--color-switch-bg-checked);
}

.switch-label input:checked + .switch-slider:before {
  transform: translateX(26px);
}

.error {
  color: var(--color-error);
  margin-top: 0.5rem;
  padding: var(--spacing-error-padding);
  background-color: var(--color-error-bg);
  border-radius: var(--spacing-error-border-radius);
  text-align: center;
}

.success {
  color: var(--color-success);
  margin-top: 0.5rem;
  padding: var(--spacing-success-padding);
  background-color: var(--color-success-bg);
  border-radius: var(--spacing-success-border-radius);
  text-align: center;
}

.input-with-prefix {
  display: flex;
  align-items: center;
  background-color: var(--color-input-bg);
  border-radius: var(--spacing-input-border-radius);
  overflow: hidden;
  border: 1px solid var(--color-input-border);
}

.input-with-prefix .prefix {
  padding: var(--spacing-input-prefix-padding);
  background-color: var(--color-input-prefix-bg);
  color: var(--color-input-prefix-text);
  font-size: 14px;
  white-space: nowrap;
}

.input-with-prefix input {
  border: none;
  border-radius: 0;
  background: transparent;
  flex: 1;
}

.input-with-prefix:focus-within {
  border-color: var(--color-input-focus-border);
  box-shadow: 0 0 0 2px var(--color-input-focus-shadow);
}

@media (max-width: 480px) {
  .profile-content {
    padding: 4rem 5% 1.5rem;
  }

  .avatar {
    width: 5rem;
    height: 5rem;
    top: 5rem;
  }

  .profile-info-cols .col {
    flex: 1 1 100%;
    padding: 0.5rem 0;
  }

  .block {
    padding: 1.2rem;
  }

  .btn-container {
    flex-direction: column;
  }

  .save-btn {
    width: 100%;
  }

  .grid-2x2 {
    grid-template-columns: 1fr;
  }
}

@media (min-width: 481px) and (max-width: 768px) {
  .profile-info-cols .col {
    flex: 1 1 45%;
  }

  .user-col {
    flex-basis: 100%;
    margin-bottom: 1rem;
  }

  .grid-2x2 {
    grid-template-columns: 1fr;
  }
}

@media (min-width: 769px) and (max-width: 1024px) {
  .profile-info-cols .col {
    flex: 1 1 30%;
  }
}

@media (min-width: 1200px) {
  .profile-info-cols {
    align-items: center;
  }

  .block {
    padding: 2.5rem;
  }

  .btn-container {
    justify-content: flex-end; 
  }
}

@media (min-width: 1800px) {
  main {
    max-width: 1400px; 
  }

  body {
    font-size: 18px; 
  }
}


@media (hover: none) {
  input,
  textarea,
  .save-btn,
  .switch-label {
    cursor: default;
  }

  .save-btn {
    padding: 0.9rem 1.5rem; 
  }

  .switch-slider {
    width: 56px; 
    height: 28px; 
  }

  .switch-slider:before {
    height: 22px; 
    width: 22px; 
  }
}


  .error-message {
    color: var(--color-error-message);
    margin-bottom: var(--spacing-error-message-margin-bottom);
    padding: var(--spacing-error-message-padding);
    background-color: var(--color-error-message-bg);
    border-radius: var(--spacing-error-message-border-radius);
  }

  .success-message {
    color: var(--color-success-message);
    margin-bottom: var(--spacing-success-message-margin-bottom);
    padding: var(--spacing-success-message-padding);
    background-color: var(--color-success-message-bg);
    border-radius: var(--spacing-success-message-border-radius);
  }

  .cancel-btn {
    margin-left: var(--spacing-cancel-btn-margin-left);
    background-color: var(--color-cancel-btn-bg);
    color: var(--color-cancel-btn-text);
  }
</style>



<main>
  <input 
    type="file" 
    accept="image/*" 
    style="display: none;" 
    bind:this={fileInputRef} 
    on:change={uploadAvatar}
  />

  {#if globalError}
    <div class="error">{globalError}</div>
  {/if}

  <section class="profile-block">
    <div class="profile-banner"></div>
    
    <div class="avatar-container">
      <img 
        src={profileData.avatar || '/avatar.png'} 
        alt="Аватар" 
        class="avatar" 
        on:click={openFileDialog} 
      />
      
      {#if isAvatarUploading}
        <div class="avatar-overlay loading">
          <i class="material-icons-outlined">refresh</i>
        </div>
      {:else}
        <div class="avatar-overlay" on:click={openFileDialog}>
          <i class="material-icons-outlined">photo_camera</i>
          <span>Изменить</span>
        </div>
      {/if}
      
      {#if profileData.avatar && profileData.avatar !== '/avatar.png'}
        <button class="avatar-delete" on:click={deleteAvatar}>
          <i class="material-icons-outlined">delete</i>
        </button>
      {/if}
    </div>
    
    {#if avatarError}
      <div class="error avatar-message">{avatarError}</div>
    {/if}
    {#if avatarSuccess}
      <div class="success avatar-message">{avatarSuccess}</div>
    {/if}
    
    <div class="profile-content">
      <div class="profile-info-cols">
        <div class="col user-col">
          <div class="user-name">{userData.username}</div>
          <div class="user-role">
            {#if userData.role === 'teacher'}
              Преподаватель
            {:else if userData.role === 'admin'}
              Админ
            {:else if userData.role === 'assistant'}
              Помощник
            {:else if userData.role === 'student'}
              Ученик
            {/if}
          </div>
        </div>
        <div class="col phone-col">
          <div class="info-label">Телефон</div>
          <div class="phone">
            <i class="material-icons-outlined">phone</i>
            <span>{profileData.phone_number || '+7 (123) 456-78-90'}</span>
          </div>
        </div>
        <div class="col email-col">
          <div class="info-label">Почта</div>
          <div class="email">
            <i class="material-icons-outlined">mail</i>
            <span>{userData.email}</span>
          </div>
        </div>
      </div>
    </div>
  </section>

  <section class="block">
    <h2>Персональная информация</h2>
    <div class="grid-2x2">
      <div>
        <label for="username">Имя</label>
        <input
          id="username"
          type="text"
          placeholder="Например, Иван Иванов"
          bind:value={username}
        />
      </div>
      <div>
        <label for="phoneInfo">Телефон</label>
        <input
          id="phoneInfo"
          type="text"
          placeholder="Например, +7 (123) 456-78-90"
          bind:value={phoneInfo}
        />
      </div>
      <div>
        <label for="vkContact">Контакты ВК</label>
        <div class="input-with-prefix">
          <span class="prefix">https://</span>
          <input
            id="vkContact"
            type="text"
            placeholder="vk.com/yourprofile"
            bind:value={vkLinkRest}
          />
        </div>
      </div>
      <div>
        <label for="telegramContact">Телеграм</label>
        <div class="input-with-prefix">
          <span class="prefix">https://</span>
          <input
            id="telegramContact"
            type="text"
            placeholder="t.me/yourprofile"
            bind:value={telegramLinkRest}
          />
        </div>
      </div>
    </div>
    <div class="btn-container">
      <button class="save-btn" on:click={savePersonalInfo}>Сохранить</button>
    </div>
    {#if personalInfoError}
      <div class="error">{personalInfoError}</div>
    {/if}
    {#if personalInfoSuccess}
      <div class="success">{personalInfoSuccess}</div>
    {/if}
  </section>


  <section class="block">
    <h2>О себе</h2>
    <label for="aboutMe">Расскажите о себе</label>
    <textarea
      id="aboutMe"
      placeholder="Например, я увлекаюсь программированием и путешествиями..."
      bind:value={aboutMe}
    ></textarea>
    <div class="btn-container">
      <button class="save-btn" on:click={saveAboutMe}>Сохранить</button>
    </div>
    {#if aboutMeError}
      <div class="error">{aboutMeError}</div>
    {/if}
    {#if aboutMeSuccess}
      <div class="success">{aboutMeSuccess}</div>
    {/if}
  </section>

  <section class="block">
    <h2>Почта</h2>
    
    {#if emailChangeError}
      <div class="error-message">{emailChangeError}</div>
    {/if}
    
    {#if emailChangeSuccess}
      <div class="success-message">{emailChangeSuccess}</div>
    {/if}
    
    {#if !showEmailConfirmation}
      <div class="flex-row">
        <div class="form-group">
          <label for="newEmail">Новая почта</label>
          <input 
            id="newEmail" 
            type="email" 
            placeholder="Введите новую почту" 
            bind:value={newEmail}
          />
        </div>
        <div class="form-group">
          <label for="emailPassword">Пароль</label>
          <input 
            id="emailPassword" 
            type="password" 
            placeholder="Введите пароль" 
            bind:value={emailPassword}
          />
        </div>
      </div>
      <div class="btn-container">
        <button class="save-btn" on:click={requestEmailChange}>Сменить почту</button>
      </div>
    {:else}
      <div class="form-group">
        <label for="emailConfirmCode">Код подтверждения</label>
        <input 
          id="emailConfirmCode" 
          type="text" 
          placeholder="Введите код из письма" 
          bind:value={emailConfirmCode}
        />
      </div>
      <div class="btn-container">
        <button class="save-btn" on:click={confirmEmailChange}>Подтвердить</button>
        <button class="cancel-btn" on:click={() => showEmailConfirmation = false}>Отмена</button>
      </div>
    {/if}
  </section>

  <section class="block">
    <h2>Пароли</h2>
    
    {#if passwordChangeError}
      <div class="error-message">{passwordChangeError}</div>
    {/if}
    
    {#if passwordChangeSuccess}
      <div class="success-message">{passwordChangeSuccess}</div>
    {/if}
    
    {#if !showPasswordConfirmation}
      <div class="flex-row">
        <div class="form-group">
          <label for="oldPassword">Старый пароль</label>
          <input 
            id="oldPassword" 
            type="password" 
            placeholder="Введите старый пароль" 
            bind:value={oldPassword}
          />
        </div>
        <div class="form-group">
          <label for="newPassword">Новый пароль</label>
          <input 
            id="newPassword" 
            type="password" 
            placeholder="Введите новый пароль" 
            bind:value={newPassword}
          />
        </div>
        <div class="form-group">
          <label for="confirmPassword">Повторите пароль</label>
          <input 
            id="confirmPassword" 
            type="password" 
            placeholder="Повторите новый пароль" 
            bind:value={confirmPassword}
          />
        </div>
      </div>
      <div class="btn-container">
        <button class="save-btn" on:click={requestPasswordChange}>Сменить пароль</button>
      </div>
    {:else}
      <div class="form-group">
        <label for="passwordConfirmCode">Код подтверждения</label>
        <input 
          id="passwordConfirmCode" 
          type="text" 
          placeholder="Введите код из письма" 
          bind:value={passwordConfirmCode}
        />
      </div>
      <div class="btn-container">
        <button class="save-btn" on:click={confirmPasswordChange}>Подтвердить</button>
        <button class="cancel-btn" on:click={() => showPasswordConfirmation = false}>Отмена</button>
      </div>
    {/if}
  </section>

  <section class="block">
    <h2>Настройки</h2>
    <!-- <div class="settings-item">
      <label class="switch-label" for="darkModeToggle">
        <input
          id="darkModeToggle"
          type="checkbox"
          checked={profileSettings.theme === 'dark'}
          on:change={toggleTheme}
        />
        <span class="switch-slider"></span>
        Тёмная/Светлая тема
      </label>
    </div> -->
    <div class="settings-item">
      <label class="switch-label" for="showAnswersToggle">
        <input
          id="showAnswersToggle"
          type="checkbox"
          checked={profileSettings.show_test_answers}
          on:change={toggleShowTestAnswers}
        />
        <span class="switch-slider"></span>
        Отображение ответов выполненных тестов
      </label>
    </div>
  </section>

</main>