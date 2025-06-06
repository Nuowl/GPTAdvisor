// Settings_Page/settings_script.js

document.addEventListener('DOMContentLoaded', function() {
    // ... (이전 DOM 요소 및 변수 선언은 동일) ...
    const deleteAccountButton = document.getElementById('delete-account-button');
    const sidebarProfilePic = document.getElementById('sidebar-profile-pic');
    const sidebarUsername = document.getElementById('sidebar-username');
    const settingsProfileImgDisplay = document.getElementById('settings-profile-img-display');
    const settingsUsernameDisplay = document.getElementById('settings-username-display');
    const profileImageUpload = document.getElementById('profile-image-upload');
    const nicknameInput = document.getElementById('nickname');
    const heightInput = document.getElementById('height');
    const weightInput = document.getElementById('weight');
    const genderButtons = document.querySelectorAll('.gender-button');
    const saveInfoButton = document.getElementById('save-info-button');
    const downloadDataButton = document.getElementById('download-data-button');
    const logoutButton = document.getElementById('logout-button');
    const accountInfoForm = document.getElementById('account-info-form');

    let loggedInUserEmail = localStorage.getItem('loggedInUserEmail');
    let currentUserData = null; 
    let originalValues = {};    
    let profileImageChanged = false;
    let newProfileImageBase64 = null;
    const defaultProfilePic = '../image/user_profile_default.png'; 

    function loadUserData() {
        if (!loggedInUserEmail) {
            alert("로그인 정보가 없습니다. 로그인 페이지로 이동합니다.");
            window.location.href = '../Advisor_login/index.html';
            return;
        }
        const users = JSON.parse(localStorage.getItem('advisorGptUsers')) || [];
        currentUserData = users.find(user => user.email === loggedInUserEmail);

        if (currentUserData) {
            const userProfileImageKey = 'userProfileImage_' + loggedInUserEmail;
            const storedUserPic = localStorage.getItem(userProfileImageKey) || currentUserData.profileImage || defaultProfilePic;
            settingsProfileImgDisplay.src = storedUserPic;
            if (sidebarProfilePic) sidebarProfilePic.src = storedUserPic;
            const nickname = currentUserData.nickname || 'User';
            settingsUsernameDisplay.textContent = nickname;
            if (sidebarUsername) sidebarUsername.textContent = nickname;
            nicknameInput.value = nickname === 'User' ? '' : nickname;
            heightInput.value = currentUserData.height || '';
            weightInput.value = currentUserData.weight || '';
            if (currentUserData.gender) {
                genderButtons.forEach(btn => {
                    btn.classList.toggle('selected', btn.dataset.gender === currentUserData.gender);
                });
            } else { genderButtons.forEach(btn => btn.classList.remove('selected')); }
            originalValues = { nickname: nicknameInput.value, height: heightInput.value, weight: weightInput.value, gender: currentUserData.gender, profilePic: storedUserPic };
            profileImageChanged = false; newProfileImageBase64 = null; updateSaveButtonState();
        } else {
            alert("사용자 정보를 불러올 수 없습니다. 다시 로그인해주세요.");
            localStorage.removeItem('loggedInUserEmail'); window.location.href = '../Advisor_login/index.html';
        }
    }
    function checkForChanges() {
        if (!currentUserData) return false;
        if (profileImageChanged) return true;
        if (nicknameInput.value !== originalValues.nickname) return true;
        if (heightInput.value !== originalValues.height) return true;
        if (weightInput.value !== originalValues.weight) return true;
        const currentSelectedGenderButton = document.querySelector('.gender-button.selected');
        const currentSelectedGender = currentSelectedGenderButton ? currentSelectedGenderButton.dataset.gender : null;
        if (currentSelectedGender !== originalValues.gender) return true;
        return false;
    }
    function updateSaveButtonState() { saveInfoButton.disabled = !checkForChanges(); }

    profileImageUpload.addEventListener('change', function(event) {
        const file = event.target.files[0];
        if (file && (file.type === "image/jpeg" || file.type === "image/png")) {
            const reader = new FileReader();
            reader.onload = function(e) {
                settingsProfileImgDisplay.src = e.target.result; newProfileImageBase64 = e.target.result;
                profileImageChanged = true; updateSaveButtonState();
            }
            reader.readAsDataURL(file);
        } else { alert("JPG 또는 PNG 파일만 업로드 가능합니다."); profileImageUpload.value = ''; }
    });
    genderButtons.forEach(button => {
        button.addEventListener('click', function() {
            if (this.classList.contains('selected')) return;
            genderButtons.forEach(btn => btn.classList.remove('selected')); this.classList.add('selected');
            updateSaveButtonState();
        });
    });
    [nicknameInput, heightInput, weightInput].forEach(input => { input.addEventListener('input', updateSaveButtonState); });
    
    accountInfoForm.addEventListener('submit', function(event) {
        event.preventDefault();
        if (!checkForChanges() || !currentUserData) { alert("변경된 내용이 없거나 사용자 정보가 유효하지 않습니다."); return; }
        let users = JSON.parse(localStorage.getItem('advisorGptUsers')) || [];
        const userIndex = users.findIndex(user => user.email === loggedInUserEmail);
        if (userIndex !== -1) {
            const updatedNickname = nicknameInput.value.trim() || 'User';
            users[userIndex].nickname = updatedNickname; users[userIndex].height = heightInput.value; users[userIndex].weight = weightInput.value;
            const currentSelectedGenderButton = document.querySelector('.gender-button.selected');
            users[userIndex].gender = currentSelectedGenderButton ? currentSelectedGenderButton.dataset.gender : null;
            if (profileImageChanged && newProfileImageBase64) {
                const userProfileImageKey = 'userProfileImage_' + loggedInUserEmail;
                localStorage.setItem(userProfileImageKey, newProfileImageBase64);
                if (sidebarProfilePic) sidebarProfilePic.src = newProfileImageBase64;
                settingsProfileImgDisplay.src = newProfileImageBase64;
            }
            localStorage.setItem('advisorGptUsers', JSON.stringify(users));
            if (sidebarUsername) sidebarUsername.textContent = updatedNickname; settingsUsernameDisplay.textContent = updatedNickname;
            localStorage.setItem('userNickname', updatedNickname);
            if (profileImageChanged && newProfileImageBase64) { localStorage.setItem('userProfileImage', newProfileImageBase64); }
            alert('정보가 성공적으로 변경되었습니다.');
            currentUserData = users[userIndex]; // 중요: 현재 스크립트 내 변수 업데이트
            originalValues = { nickname: nicknameInput.value, height: heightInput.value, weight: weightInput.value, gender: users[userIndex].gender, profilePic: settingsProfileImgDisplay.src };
            profileImageChanged = false; newProfileImageBase64 = null; updateSaveButtonState();
        } else { alert("오류: 현재 로그인된 사용자 정보를 찾을 수 없습니다."); }
    });

    downloadDataButton.addEventListener('click', async function() {
        const usersForPdf = JSON.parse(localStorage.getItem('advisorGptUsers')) || [];
        const userForPdfData = usersForPdf.find(user => user.email === loggedInUserEmail);
        // const profilePicForPdf = localStorage.getItem('userProfileImage_' + loggedInUserEmail) || defaultProfilePic; // PDF에 프로필 이미지 추가 시 사용 가능
        if (!userForPdfData) { alert("PDF를 생성할 사용자 정보가 없습니다."); return; }
        const { jsPDF } = window.jspdf; const pdf = new jsPDF();
        const base64FontData = typeof nanumGothicBase64Data !== 'undefined' ? nanumGothicBase64Data : '';
        if (base64FontData.trim().length < 10000 && navigator.language.startsWith('ko')) { alert("PDF 생성 경고: 한글 폰트 데이터가 로드되지 않아 한글이 깨질 수 있습니다.");}
        try {
            if (base64FontData.trim().length >= 10000) { pdf.addFileToVFS('NanumGothic-Regular.ttf', base64FontData); pdf.addFont('NanumGothic-Regular.ttf', 'NanumGothic', 'normal'); pdf.setFont('NanumGothic', 'normal');
            } else { pdf.setFont("helvetica", "normal"); }
        } catch (error) { console.error("Error applying Korean font to PDF:", error); pdf.setFont("helvetica", "normal"); }
        let yPosition = 15; const lineHeight = 7; const indent = 10; const pageHeight = pdf.internal.pageSize.height; const margin = 15;
        function addText(text, x, y, options = {}) { 
            if (y > pageHeight - margin - lineHeight) { pdf.addPage(); yPosition = margin; y = yPosition; }
            const fontSize = options.fontSize || 10; pdf.setFontSize(fontSize); pdf.text(text, x, y);
            yPosition = y + lineHeight * (fontSize / 10); return yPosition;
        }
        yPosition = addText("AdvisorGPT 사용자 데이터 요약", indent, yPosition, { fontSize: 16 }); yPosition += lineHeight;
        yPosition = addText(`사용자 별명: ${userForPdfData.nickname || 'User'}`, indent, yPosition); yPosition = addText(`이메일: ${userForPdfData.email}`, indent, yPosition);
        yPosition = addText(`키: ${userForPdfData.height || '-'} cm`, indent, yPosition); yPosition = addText(`몸무게: ${userForPdfData.weight || '-'} kg`, indent, yPosition);
        yPosition = addText(`성별: ${userForPdfData.gender || '-'}`, indent, yPosition);
        const userGoalScoreKey = 'userGoalScore_' + loggedInUserEmail;
        const goalScoreForPdf = localStorage.getItem(userGoalScoreKey) || defaultGoalScore; // 건강 리포트의 기본값과 동일하게
        yPosition = addText(`나의 목표 평균 점수: ${goalScoreForPdf} 점`, indent, yPosition);
        yPosition += lineHeight;
        yPosition = addText("일일 기록 데이터:", indent, yPosition, { fontSize: 12 }); yPosition = addText("(현재 기록된 일일 데이터 없음 - 추후 연동 예정)", indent, yPosition); yPosition += lineHeight;
        yPosition = addText("주간 평균 데이터:", indent, yPosition, { fontSize: 12 }); yPosition = addText("(현재 기록된 주간 평균 데이터 없음 - 추후 연동 예정)", indent, yPosition); yPosition += lineHeight;
        yPosition = addText("챗봇 대화 내역:", indent, yPosition, { fontSize: 12 }); yPosition = addText("(현재 기록된 챗봇 대화 내역 없음 - 추후 연동 예정)", indent, yPosition);
        pdf.save(`AdvisorGPT_데이터_${userForPdfData.nickname || 'User'}.pdf`);
    });

    logoutButton.addEventListener('click', function() {
        localStorage.removeItem('loggedInUserEmail');
        localStorage.removeItem('userNickname');
        localStorage.removeItem('userProfileImage');
        alert('로그아웃 되었습니다.');
        window.location.href = '../Advisor_login/index.html';
    });

    // 계정 탈퇴 버튼 이벤트 리스너 추가
    deleteAccountButton.addEventListener('click', function() {
        if (!loggedInUserEmail) {
            alert("로그인 정보가 없어 계정을 탈퇴할 수 없습니다.");
            return;
        }

        const confirmation = confirm("정말로 계정을 탈퇴하시겠습니까? 이 작업은 되돌릴 수 없으며, 모든 사용자 데이터가 삭제됩니다.");

        if (confirmation) {
            let users = JSON.parse(localStorage.getItem('advisorGptUsers')) || [];
            // 현재 로그인된 사용자를 제외한 새로운 사용자 배열 생성
            const remainingUsers = users.filter(user => user.email !== loggedInUserEmail);
            localStorage.setItem('advisorGptUsers', JSON.stringify(remainingUsers));

            // 현재 로그인된 사용자와 관련된 모든 개별 localStorage 항목 삭제
            localStorage.removeItem('userProfileImage_' + loggedInUserEmail);
            // 만약 일일 기록, 챗봇 내역 등이 이메일 기반 키로 저장되었다면 함께 삭제
            // 예: localStorage.removeItem('userDailyRecords_' + loggedInUserEmail);
            //     localStorage.removeItem('userChatHistory_' + loggedInUserEmail);

            // 로그인 상태 정보도 삭제
            localStorage.removeItem('loggedInUserEmail');
            localStorage.removeItem('userNickname');
            localStorage.removeItem('userProfileImage');
            
            alert("계정이 성공적으로 탈퇴되었습니다. 로그인 화면으로 이동합니다.");
            window.location.href = '../Advisor_login/index.html';
        }
    });

    loadUserData(); // 페이지 로드 시 사용자 데이터 로드

    // 사이드바 활성화 로직 (이전과 동일)
    const currentSettingsPath = "settings.html"; 
    const sidebarMenuLinks = document.querySelectorAll('#sidebar-menu li a');
    sidebarMenuLinks.forEach(link => { link.parentElement.classList.remove('active'); });
    const settingsLink = Array.from(sidebarMenuLinks).find(a => {
        const linkHref = a.getAttribute('href'); const iconSrc = a.parentElement.querySelector('.menu-icon') ? a.parentElement.querySelector('.menu-icon').src : '';
        return (linkHref && linkHref.includes(currentSettingsPath)) || (linkHref === "../Settings_Page/settings.html") || (linkHref === "#" && iconSrc.includes('icon_settings'));
    });
    if (settingsLink) { settingsLink.parentElement.classList.add('active');
    } else { document.querySelector('#sidebar-menu li a[href*="settings.html"]')?.parentElement.classList.add('active'); }
});
