// Settings_Page/settings_script.js

document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
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
    let currentUserData = null; // 현재 로그인된 사용자의 전체 데이터 객체
    let originalValues = {};    // 초기 로드된 값 (변경 감지용)
    let profileImageChanged = false; // 프로필 이미지 변경 여부 플래그
    const defaultProfilePic = '../image/user_profile_default.png'; // 기본 프로필 이미지 경로

    // 사용자 데이터 로드 및 UI 채우기
    function loadUserData() {
        if (!loggedInUserEmail) {
            alert("로그인 정보가 없습니다. 로그인 페이지로 이동합니다.");
            window.location.href = '../Advisor_login/index.html'; // 로그인 페이지 경로
            return;
        }

        const users = JSON.parse(localStorage.getItem('advisorGptUsers')) || [];
        currentUserData = users.find(user => user.email === loggedInUserEmail);

        if (currentUserData) {
            // 프로필 이미지 설정 (사용자 지정 이미지 우선, 없으면 기본 이미지)
            const userProfileImageKey = 'userProfileImage_' + loggedInUserEmail;
            const storedUserPic = localStorage.getItem(userProfileImageKey) || currentUserData.profileImage || defaultProfilePic;

            settingsProfileImgDisplay.src = storedUserPic;
            if (sidebarProfilePic) sidebarProfilePic.src = storedUserPic;

            // 별명 설정
            const nickname = currentUserData.nickname || 'User';
            settingsUsernameDisplay.textContent = nickname;
            if (sidebarUsername) sidebarUsername.textContent = nickname;
            nicknameInput.value = nickname === 'User' ? '' : nickname; // 'User'는 플레이스홀더처럼 취급

            // 키, 몸무게 설정
            heightInput.value = currentUserData.height || '';
            weightInput.value = currentUserData.weight || '';

            // 성별 설정
            if (currentUserData.gender) {
                genderButtons.forEach(btn => {
                    btn.classList.toggle('selected', btn.dataset.gender === currentUserData.gender);
                });
            } else { // 저장된 성별 정보가 없으면 기본값 (예: 남성) 또는 선택 안 함
                genderButtons.forEach(btn => btn.classList.remove('selected'));
                // document.querySelector('.gender-button[data-gender="male"]').classList.add('selected'); // 예: 남성을 기본으로
            }

            // 변경 감지를 위한 원본 값 저장
            originalValues = {
                nickname: nicknameInput.value,
                height: heightInput.value,
                weight: weightInput.value,
                gender: currentUserData.gender,
                profilePic: storedUserPic // 원본 프로필 사진 경로 저장
            };
            profileImageChanged = false; // 로드 시에는 이미지 변경 안 됨
            updateSaveButtonState();

        } else {
            // 해당 이메일의 사용자 정보가 없는 비정상적인 경우
            alert("사용자 정보를 불러올 수 없습니다. 다시 로그인해주세요.");
            localStorage.removeItem('loggedInUserEmail'); // 잘못된 로그인 정보 제거
            window.location.href = '../Advisor_login/index.html';
        }
    }

    // "정보 변경" 버튼 활성화/비활성화 상태 업데이트
    function checkForChanges() {
        if (!currentUserData) return false; // 사용자 데이터 없으면 변경 불가

        let changed = false;
        if (profileImageChanged) return true; // 이미지 변경 시 무조건 활성화

        if (nicknameInput.value !== originalValues.nickname) changed = true;
        if (heightInput.value !== originalValues.height) changed = true;
        if (weightInput.value !== originalValues.weight) changed = true;
        
        const currentSelectedGenderButton = document.querySelector('.gender-button.selected');
        const currentSelectedGender = currentSelectedGenderButton ? currentSelectedGenderButton.dataset.gender : null;
        if (currentSelectedGender !== originalValues.gender) changed = true;
        
        return changed;
    }

    function updateSaveButtonState() {
        saveInfoButton.disabled = !checkForChanges();
    }

    // 프로필 이미지 업로드 처리
    profileImageUpload.addEventListener('change', function(event) {
        const file = event.target.files[0];
        if (file && (file.type === "image/jpeg" || file.type === "image/png")) {
            const reader = new FileReader();
            reader.onload = function(e) {
                settingsProfileImgDisplay.src = e.target.result;
                // 사이드바 프로필도 즉시 업데이트 (선택 사항, 저장 시점에만 할 수도 있음)
                if (sidebarProfilePic) sidebarProfilePic.src = e.target.result;
                profileImageChanged = true;
                updateSaveButtonState();
            }
            reader.readAsDataURL(file);
        } else {
            alert("JPG 또는 PNG 파일만 업로드 가능합니다.");
            profileImageUpload.value = ''; // 잘못된 파일 선택 시 입력 초기화
        }
    });

    // 성별 버튼 클릭 처리
    genderButtons.forEach(button => {
        button.addEventListener('click', function() {
            if (this.classList.contains('selected')) return; // 이미 선택된 버튼은 무시

            genderButtons.forEach(btn => btn.classList.remove('selected'));
            this.classList.add('selected');
            updateSaveButtonState();
        });
    });

    // 입력 필드 변경 감지
    [nicknameInput, heightInput, weightInput].forEach(input => {
        input.addEventListener('input', updateSaveButtonState);
    });
    
    // 계정 정보 저장 처리
    accountInfoForm.addEventListener('submit', function(event) {
        event.preventDefault();
        if (!checkForChanges() || !currentUserData) {
            alert("변경된 내용이 없거나 사용자 정보가 유효하지 않습니다.");
            return;
        }

        let users = JSON.parse(localStorage.getItem('advisorGptUsers')) || [];
        const userIndex = users.findIndex(user => user.email === loggedInUserEmail);

        if (userIndex !== -1) {
            // 정보 업데이트
            const updatedNickname = nicknameInput.value.trim() || 'User'; // 빈 값이면 'User'로
            users[userIndex].nickname = updatedNickname;
            users[userIndex].height = heightInput.value;
            users[userIndex].weight = weightInput.value;
            
            const currentSelectedGenderButton = document.querySelector('.gender-button.selected');
            users[userIndex].gender = currentSelectedGenderButton ? currentSelectedGenderButton.dataset.gender : null;

            // 프로필 이미지 저장 (변경된 경우에만)
            if (profileImageChanged) {
                const userProfileImageKey = 'userProfileImage_' + loggedInUserEmail;
                localStorage.setItem(userProfileImageKey, settingsProfileImgDisplay.src);
                // users 배열 내의 profileImage 필드도 업데이트 할 수 있으나, 현재는 개별 키로 관리
                // users[userIndex].profileImage = settingsProfileImgDisplay.src; 
            }

            localStorage.setItem('advisorGptUsers', JSON.stringify(users));

            // 전역 UI 업데이트 (닉네임, 프로필 사진)
            if (sidebarUsername) sidebarUsername.textContent = updatedNickname;
            settingsUsernameDisplay.textContent = updatedNickname;
            // 프로필 사진은 이미 업로드 시 사이드바에 반영되었거나, 여기서 다시 로드해도 됨
            if (sidebarProfilePic && profileImageChanged) sidebarProfilePic.src = settingsProfileImgDisplay.src;


            // localStorage의 최상위 userNickname, userProfileImage도 업데이트 (다른 페이지에서 직접 사용 시)
            localStorage.setItem('userNickname', updatedNickname);
            if (profileImageChanged) localStorage.setItem('userProfileImage', settingsProfileImgDisplay.src);


            alert('정보가 성공적으로 변경되었습니다.');
            
            // 변경된 값을 원본 값으로 업데이트하고 버튼 비활성화
            originalValues = {
                nickname: nicknameInput.value,
                height: heightInput.value,
                weight: weightInput.value,
                gender: users[userIndex].gender,
                profilePic: settingsProfileImgDisplay.src
            };
            profileImageChanged = false;
            updateSaveButtonState();
            // window.location.reload(); // UI가 즉시 반영되므로 새로고침 불필요 또는 선택적

        } else {
            alert("오류: 현재 로그인된 사용자 정보를 찾을 수 없습니다.");
        }
    });

    // 데이터 다운로드 (PDF)
    downloadDataButton.addEventListener('click', async function() {
        if (!currentUserData) {
            alert("PDF를 생성할 사용자 정보가 없습니다.");
            return;
        }

        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF();

        // 한글 폰트 데이터 (fontData.js에서 nanumGothicBase64Data 변수를 가져온다고 가정)
        const base64FontData = typeof nanumGothicBase64Data !== 'undefined' ? nanumGothicBase64Data : '';

        if (base64FontData.trim().length < 10000 && navigator.language.startsWith('ko')) {
            alert("PDF 생성 경고: 한글 폰트 데이터가 로드되지 않아 한글이 깨질 수 있습니다.");
        }

        try {
            if (base64FontData.trim().length >= 10000) {
                pdf.addFileToVFS('NanumGothic-Regular.ttf', base64FontData);
                pdf.addFont('NanumGothic-Regular.ttf', 'NanumGothic', 'normal');
                pdf.setFont('NanumGothic', 'normal');
            } else {
                pdf.setFont("helvetica", "normal"); // Fallback
            }
        } catch (error) {
            console.error("Error applying Korean font to PDF:", error);
            pdf.setFont("helvetica", "normal"); // Fallback on error
        }

        let yPosition = 15;
        const lineHeight = 7;
        const indent = 10;
        const pageHeight = pdf.internal.pageSize.height;
        const margin = 15;

        function addText(text, x, y, options = {}) {
            if (y > pageHeight - margin - lineHeight) { // 다음 줄 공간 확보
                pdf.addPage();
                yPosition = margin; // 새 페이지의 시작 y 위치
                y = yPosition;
            }
            const fontSize = options.fontSize || 10;
            pdf.setFontSize(fontSize);
            pdf.text(text, x, y);
            yPosition = y + lineHeight * (fontSize / 10); // 현재 줄 높이만큼만 증가
            return yPosition; // 다음 줄이 시작될 y 위치 반환
        }
        
        yPosition = addText("AdvisorGPT 사용자 데이터 요약", indent, yPosition, { fontSize: 16 });
        yPosition += lineHeight; // 섹션 간 간격

        yPosition = addText(`사용자 별명: ${currentUserData.nickname || 'User'}`, indent, yPosition);
        yPosition = addText(`이메일: ${currentUserData.email}`, indent, yPosition);
        yPosition = addText(`키: ${currentUserData.height || '-'} cm`, indent, yPosition);
        yPosition = addText(`몸무게: ${currentUserData.weight || '-'} kg`, indent, yPosition);
        yPosition = addText(`성별: ${currentUserData.gender || '-'}`, indent, yPosition);
        yPosition += lineHeight;

        yPosition = addText("일일 기록 데이터:", indent, yPosition, { fontSize: 12 });
        yPosition = addText("(현재 기록된 일일 데이터 없음 - 추후 연동 예정)", indent, yPosition);
        // TODO: 실제 일일 기록 데이터 로드 및 추가 로직
        // const dailyRecords = JSON.parse(localStorage.getItem('userDailyRecords_' + loggedInUserEmail)) || [];
        // if (dailyRecords.length > 0) {
        //     dailyRecords.forEach(record => {
        //         const recordText = `- ${record.date}: 건강점수 ${record.score}, 수면 ${record.sleep}시간...`;
        //         const lines = pdf.splitTextToSize(recordText, pdf.internal.pageSize.width - indent * 2);
        //         lines.forEach(line => { yPosition = addText(line, indent, yPosition); });
        //     });
        // } else {
        //     yPosition = addText("  기록된 데이터가 없습니다.", indent, yPosition);
        // }
        yPosition += lineHeight;

        yPosition = addText("주간 평균 데이터:", indent, yPosition, { fontSize: 12 });
        yPosition = addText("(현재 기록된 주간 평균 데이터 없음 - 추후 연동 예정)", indent, yPosition);
        // TODO: 실제 주간 평균 데이터 로드 및 추가 로직
        yPosition += lineHeight;
        
        yPosition = addText("챗봇 대화 내역:", indent, yPosition, { fontSize: 12 });
        yPosition = addText("(현재 기록된 챗봇 대화 내역 없음 - 추후 연동 예정)", indent, yPosition);
        // TODO: 실제 챗봇 대화 내역 로드 및 추가 로직 (날짜별 그룹화 필요)
        // const chatHistory = JSON.parse(localStorage.getItem('userChatHistory_' + loggedInUserEmail)) || [];
        // if (chatHistory.length > 0) {
        //     let currentDate = '';
        //     chatHistory.forEach(chat => {
        //         if (chat.date !== currentDate) {
        //             yPosition = addText(`\n  [${chat.date}]`, indent, yPosition);
        //             currentDate = chat.date;
        //         }
        //         const chatText = `  ${chat.sender}: ${chat.message}`;
        //         const lines = pdf.splitTextToSize(chatText, pdf.internal.pageSize.width - indent * 2 - 5); // 들여쓰기 고려
        //         lines.forEach(line => { yPosition = addText(line, indent + 5, yPosition); });
        //     });
        // } else {
        //     yPosition = addText("  기록된 대화가 없습니다.", indent, yPosition);
        // }

        pdf.save(`AdvisorGPT_데이터_${currentUserData.nickname || 'User'}.pdf`);
    });

    // 로그아웃 처리
    logoutButton.addEventListener('click', function() {
        // 로그인 관련 localStorage 항목들 제거
        localStorage.removeItem('loggedInUserEmail');
        localStorage.removeItem('userNickname');
        localStorage.removeItem('userProfileImage');
        // 필요하다면 전체 사용자 정보(advisorGptUsers)는 남겨둘 수 있음
        // 또는 특정 사용자 관련 모든 데이터를 지우는 로직 추가 가능

        alert('로그아웃 되었습니다.');
        window.location.href = '../Advisor_login/index.html'; // 로그인 페이지 경로
    });

    // 페이지 로드 시 사용자 데이터 로드
    loadUserData();

    // 사이드바 활성 상태 설정
    const currentSettingsPath = "settings.html"; 
    const sidebarMenuLinks = document.querySelectorAll('#sidebar-menu li a');
    sidebarMenuLinks.forEach(link => {
        link.parentElement.classList.remove('active');
    });
    const settingsLink = Array.from(sidebarMenuLinks).find(a => {
        const linkHref = a.getAttribute('href');
        const iconSrc = a.parentElement.querySelector('.menu-icon') ? a.parentElement.querySelector('.menu-icon').src : '';
        return (linkHref && linkHref.includes(currentSettingsPath)) || 
               (linkHref === "../Settings_Page/settings.html") || // 직접적인 경로 비교 추가
                (linkHref === "#" && iconSrc.includes('icon_settings'));
    });
    if (settingsLink) {
        settingsLink.parentElement.classList.add('active');
    } else { // 만약 위 조건으로 못찾으면, li.active 클래스를 직접 html에 추가한 경우를 위해 한 번 더 확인
        document.querySelector('#sidebar-menu li a[href*="settings.html"]')?.parentElement.classList.add('active');
    }
});
