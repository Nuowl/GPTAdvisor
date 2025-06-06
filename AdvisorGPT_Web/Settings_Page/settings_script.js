// Settings_Page/settings_script.js

document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements (이전과 동일)
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
    let newProfileImageBase64 = null; // 2. 새로 선택된 프로필 이미지 데이터 임시 저장
    const defaultProfilePic = '../image/user_profile_default.png'; 

    function loadUserData() {
        if (!loggedInUserEmail) {
            // ... (로그인 정보 없을 시 처리 - 이전과 동일) ...
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
            } else {
                genderButtons.forEach(btn => btn.classList.remove('selected'));
            }

            originalValues = {
                nickname: nicknameInput.value,
                height: heightInput.value,
                weight: weightInput.value,
                gender: currentUserData.gender,
                profilePic: storedUserPic 
            };
            profileImageChanged = false;
            newProfileImageBase64 = null; // 로드 시에는 새 이미지 없음
            updateSaveButtonState();

        } else {
            // ... (사용자 정보 없을 시 처리 - 이전과 동일) ...
            alert("사용자 정보를 불러올 수 없습니다. 다시 로그인해주세요.");
            localStorage.removeItem('loggedInUserEmail');
            window.location.href = '../Advisor_login/index.html';
        }
    }

    function checkForChanges() {
        if (!currentUserData) return false;

        if (profileImageChanged) return true; // 이미지 변경 시 무조건 활성화

        if (nicknameInput.value !== originalValues.nickname) return true;
        if (heightInput.value !== originalValues.height) return true;
        if (weightInput.value !== originalValues.weight) return true;
        
        const currentSelectedGenderButton = document.querySelector('.gender-button.selected');
        const currentSelectedGender = currentSelectedGenderButton ? currentSelectedGenderButton.dataset.gender : null;
        if (currentSelectedGender !== originalValues.gender) return true;
        
        return false;
    }

    function updateSaveButtonState() {
        saveInfoButton.disabled = !checkForChanges();
    }

    profileImageUpload.addEventListener('change', function(event) {
        const file = event.target.files[0];
        if (file && (file.type === "image/jpeg" || file.type === "image/png")) {
            const reader = new FileReader();
            reader.onload = function(e) {
                // 2. 실제 src 변경은 하지 않고, 미리보기만 업데이트하고 임시 변수에 저장
                settingsProfileImgDisplay.src = e.target.result; // 미리보기 업데이트
                newProfileImageBase64 = e.target.result;       // 임시 저장
                profileImageChanged = true;
                updateSaveButtonState();
            }
            reader.readAsDataURL(file);
        } else {
            alert("JPG 또는 PNG 파일만 업로드 가능합니다.");
            profileImageUpload.value = ''; 
        }
    });

    genderButtons.forEach(button => {
        button.addEventListener('click', function() {
            if (this.classList.contains('selected')) return;
            genderButtons.forEach(btn => btn.classList.remove('selected'));
            this.classList.add('selected');
            updateSaveButtonState();
        });
    });

    [nicknameInput, heightInput, weightInput].forEach(input => {
        input.addEventListener('input', updateSaveButtonState);
    });
    
    accountInfoForm.addEventListener('submit', function(event) {
        event.preventDefault();
        if (!checkForChanges() || !currentUserData) {
            alert("변경된 내용이 없거나 사용자 정보가 유효하지 않습니다.");
            return;
        }

        let users = JSON.parse(localStorage.getItem('advisorGptUsers')) || [];
        const userIndex = users.findIndex(user => user.email === loggedInUserEmail);

        if (userIndex !== -1) {
            const updatedNickname = nicknameInput.value.trim() || 'User';
            users[userIndex].nickname = updatedNickname;
            users[userIndex].height = heightInput.value;
            users[userIndex].weight = weightInput.value;
            
            const currentSelectedGenderButton = document.querySelector('.gender-button.selected');
            users[userIndex].gender = currentSelectedGenderButton ? currentSelectedGenderButton.dataset.gender : null;

            // 2. 프로필 이미지 저장 (변경된 경우에만)
            if (profileImageChanged && newProfileImageBase64) {
                const userProfileImageKey = 'userProfileImage_' + loggedInUserEmail;
                localStorage.setItem(userProfileImageKey, newProfileImageBase64);
                // users 배열 내의 profileImage 필드도 업데이트 (선택 사항, 일관성 위해)
                // users[userIndex].profileImage = newProfileImageBase64;
                if (sidebarProfilePic) sidebarProfilePic.src = newProfileImageBase64; // 사이드바도 최종 업데이트
                settingsProfileImgDisplay.src = newProfileImageBase64; // 설정 페이지 이미지도 최종 업데이트 (이미 미리보기로 되어있지만 확실히)
            }

            localStorage.setItem('advisorGptUsers', JSON.stringify(users));

            // 전역 UI 업데이트 (닉네임)
            if (sidebarUsername) sidebarUsername.textContent = updatedNickname;
            settingsUsernameDisplay.textContent = updatedNickname;

            localStorage.setItem('userNickname', updatedNickname); // 다른 페이지에서 사용할 닉네임 업데이트
            if (profileImageChanged && newProfileImageBase64) { // 다른 페이지에서 사용할 프로필 이미지 업데이트
                localStorage.setItem('userProfileImage', newProfileImageBase64);
            }

            alert('정보가 성공적으로 변경되었습니다.');
            
            // 1. 방법 A: currentUserData 변수를 최신 정보로 업데이트
            currentUserData = users[userIndex]; // 현재 스크립트 내 변수 업데이트
            // 프로필 이미지도 currentUserData에 반영 (만약 users 배열에 profileImage 필드를 둔다면)
            // if (profileImageChanged && newProfileImageBase64 && users[userIndex].profileImage) {
            //     currentUserData.profileImage = users[userIndex].profileImage;
            // } else if (profileImageChanged && newProfileImageBase64) { // users 배열에 profileImage 필드가 없다면
            //      currentUserData.profilePicForPdf = newProfileImageBase64; // PDF용 임시 필드 등
            // }


            // 변경된 값을 원본 값으로 업데이트하고 버튼 비활성화
            originalValues = {
                nickname: nicknameInput.value,
                height: heightInput.value,
                weight: weightInput.value,
                gender: users[userIndex].gender,
                profilePic: settingsProfileImgDisplay.src // 현재 화면에 보이는 이미지로 원본값 업데이트
            };
            profileImageChanged = false;
            newProfileImageBase64 = null;
            updateSaveButtonState();

            // 1. 방법 B: 페이지 자동 새로고침 (선택 사항, 방법 A 사용 시 불필요할 수 있음)
            // window.location.reload(); 
            // 만약 A 방법으로 충분하지 않거나 다른 페이지의 즉각적인 반영이 더 중요하다면 사용.

        } else {
            alert("오류: 현재 로그인된 사용자 정보를 찾을 수 없습니다.");
        }
    });

    // 데이터 다운로드 (PDF)
    downloadDataButton.addEventListener('click', async function() {
        // 1. PDF 생성 시, 현재 스크립트 내의 currentUserData를 사용하거나, 
        //    더 확실하게 하려면 localStorage에서 다시 읽어올 수 있습니다.
        //    여기서는 accountInfoForm submit 핸들러에서 currentUserData가 업데이트되었다고 가정합니다.
        //    만약 새로고침(방법 B)을 사용한다면, 이 함수는 항상 최신 데이터를 읽게 됩니다.
        //    방법 A를 사용했다면, accountInfoForm의 submit 핸들러에서 currentUserData가 잘 업데이트되어야 합니다.

        // PDF 생성 전에 최신 데이터를 한번 더 로드 (가장 확실한 방법)
        const usersForPdf = JSON.parse(localStorage.getItem('advisorGptUsers')) || [];
        const userForPdfData = usersForPdf.find(user => user.email === loggedInUserEmail);
        const profilePicForPdf = localStorage.getItem('userProfileImage_' + loggedInUserEmail) || defaultProfilePic;


        if (!userForPdfData) { // currentUserData 대신 userForPdfData 사용
            alert("PDF를 생성할 사용자 정보가 없습니다.");
            return;
        }

        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF();
        // ... (이하 PDF 생성 로직은 이전과 동일하게 유지, 단 currentUserData 대신 userForPdfData 사용) ...
        const base64FontData = typeof nanumGothicBase64Data !== 'undefined' ? nanumGothicBase64Data : '';

        if (base64FontData.trim().length < 10000 && navigator.language.startsWith('ko')) {
            alert("PDF 생성 경고: 한글 폰트 데이터가 로드되지 않아 한글이 깨질 수 있습니다.");
        }
        try {
            if (base64FontData.trim().length >= 10000) {
                pdf.addFileToVFS('NanumGothic-Regular.ttf', base64FontData);
                pdf.addFont('NanumGothic-Regular.ttf', 'NanumGothic', 'normal');
                pdf.setFont('NanumGothic', 'normal');
            } else { pdf.setFont("helvetica", "normal"); }
        } catch (error) { console.error("Error applying Korean font to PDF:", error); pdf.setFont("helvetica", "normal"); }
        
        let yPosition = 15; /* ... PDF 내용 추가 로직 ... */
        const lineHeight = 7; const indent = 10; const pageHeight = pdf.internal.pageSize.height; const margin = 15;
        function addText(text, x, y, options = {}) { /* ... addText 함수 (이전과 동일) ... */ 
            if (y > pageHeight - margin - lineHeight) { pdf.addPage(); yPosition = margin; y = yPosition; }
            const fontSize = options.fontSize || 10; pdf.setFontSize(fontSize); pdf.text(text, x, y);
            yPosition = y + lineHeight * (fontSize / 10); return yPosition;
        }
        yPosition = addText("AdvisorGPT 사용자 데이터 요약", indent, yPosition, { fontSize: 16 }); yPosition += lineHeight;
        yPosition = addText(`사용자 별명: ${userForPdfData.nickname || 'User'}`, indent, yPosition); // userForPdfData 사용
        yPosition = addText(`이메일: ${userForPdfData.email}`, indent, yPosition);
        yPosition = addText(`키: ${userForPdfData.height || '-'} cm`, indent, yPosition);
        yPosition = addText(`몸무게: ${userForPdfData.weight || '-'} kg`, indent, yPosition);
        yPosition = addText(`성별: ${userForPdfData.gender || '-'}`, indent, yPosition);
        yPosition += lineHeight;
        // (이하 일일 기록, 주간 평균, 챗봇 내역 플레이스홀더는 동일)
        yPosition = addText("일일 기록 데이터:", indent, yPosition, { fontSize: 12 });
        yPosition = addText("(현재 기록된 일일 데이터 없음 - 추후 연동 예정)", indent, yPosition);
        yPosition += lineHeight;
        yPosition = addText("주간 평균 데이터:", indent, yPosition, { fontSize: 12 });
        yPosition = addText("(현재 기록된 주간 평균 데이터 없음 - 추후 연동 예정)", indent, yPosition);
        yPosition += lineHeight;
        yPosition = addText("챗봇 대화 내역:", indent, yPosition, { fontSize: 12 });
        yPosition = addText("(현재 기록된 챗봇 대화 내역 없음 - 추후 연동 예정)", indent, yPosition);

        pdf.save(`AdvisorGPT_데이터_${userForPdfData.nickname || 'User'}.pdf`); // userForPdfData 사용
    });

    logoutButton.addEventListener('click', function() {
        // ... (로그아웃 로직 - 이전과 동일) ...
        localStorage.removeItem('loggedInUserEmail');
        localStorage.removeItem('userNickname');
        localStorage.removeItem('userProfileImage');
        alert('로그아웃 되었습니다.');
        window.location.href = '../Advisor_login/index.html';
    });

    loadUserData();
    // ... (사이드바 활성화 로직 - 이전과 동일) ...
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
