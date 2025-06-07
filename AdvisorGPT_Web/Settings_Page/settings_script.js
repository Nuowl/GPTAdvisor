// Settings_Page/settings_script.js

document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const sidebarProfilePic = document.getElementById('sidebar-profile-pic');
    const sidebarUsername = document.getElementById('sidebar-username');
    const settingsProfileImgDisplay = document.getElementById('settings-profile-img-display');
    const settingsUsernameDisplay = document.getElementById('settings-username-display');
    const profileImageUpload = document.getElementById('profile-image-upload');
    const nicknameInput = document.getElementById('nickname');
    const ageDisplayInput = document.getElementById('age_display');
    const heightInput = document.getElementById('height');
    const weightInput = document.getElementById('weight');
    const genderButtons = document.querySelectorAll('.gender-button');
    const saveInfoButton = document.getElementById('save-info-button');
    const downloadDataButton = document.getElementById('download-data-button');
    const logoutButton = document.getElementById('logout-button');
    const deleteAccountButton = document.getElementById('delete-account-button');
    const accountInfoForm = document.getElementById('account-info-form');

    let loggedInUserEmail = localStorage.getItem('loggedInUserEmail');
    let currentUserData = null; 
    let originalValues = {};    
    let profileImageChanged = false;
    let newProfileImageBase64 = null;
    const defaultProfilePic = '../image/user_profile_default.png'; 
    const defaultGoalScore = 70;

    // --- 데이터 로드 및 UI 초기화 함수 ---
    function loadUserData() {
        loggedInUserEmail = localStorage.getItem('loggedInUserEmail'); // 함수 호출 시점에 다시 한번 가져오기
        if (!loggedInUserEmail) {
            alert("로그인 정보가 없습니다. 로그인 페이지로 이동합니다.");
            window.location.href = '../Advisor_login/index.html';
            return false; // 로드 실패 의미
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

            if (ageDisplayInput) {
                ageDisplayInput.value = currentUserData.age ? `${currentUserData.age}세` : '정보 없음';
            }
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
                nickname: nicknameInput.value, age: currentUserData.age, height: heightInput.value, 
                weight: weightInput.value, gender: currentUserData.gender, profilePic: storedUserPic 
            };
            profileImageChanged = false; newProfileImageBase64 = null; 
            updateSaveButtonState();
            return true; // 로드 성공
        } else {
            alert("사용자 정보를 불러올 수 없습니다. 다시 로그인해주세요.");
            // 로그인 관련 정보만 제거, 전체 사용자 목록은 유지할 수 있음
            localStorage.removeItem('loggedInUserEmail'); 
            localStorage.removeItem('userNickname');
            localStorage.removeItem('userProfileImage');
            window.location.href = '../Advisor_login/index.html';
            return false; // 로드 실패
        }
    }

    // --- 변경 감지 및 저장 버튼 활성화 함수 ---
    function checkForChanges() { // (나이 필드는 readonly이므로 변경 감지 대상에서 제외)
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
            users[userIndex].nickname = updatedNickname; 
            users[userIndex].height = heightInput.value; 
            users[userIndex].weight = weightInput.value;
            const currentSelectedGenderButton = document.querySelector('.gender-button.selected');
            users[userIndex].gender = currentSelectedGenderButton ? currentSelectedGenderButton.dataset.gender : null;
            // users[userIndex].age 는 회원가입 시 저장된 값 유지 (현재 수정 UI 없음)

            if (profileImageChanged && newProfileImageBase64) {
                const userProfileImageKey = 'userProfileImage_' + loggedInUserEmail;
                localStorage.setItem(userProfileImageKey, newProfileImageBase64);
                if (sidebarProfilePic) sidebarProfilePic.src = newProfileImageBase64;
                settingsProfileImgDisplay.src = newProfileImageBase64;
            }
            localStorage.setItem('advisorGptUsers', JSON.stringify(users));
            if (sidebarUsername) sidebarUsername.textContent = updatedNickname; 
            settingsUsernameDisplay.textContent = updatedNickname;
            localStorage.setItem('userNickname', updatedNickname);
            if (profileImageChanged && newProfileImageBase64) { localStorage.setItem('userProfileImage', newProfileImageBase64); }
            alert('정보가 성공적으로 변경되었습니다.');
            currentUserData = users[userIndex]; 
            originalValues = { 
                nickname: nicknameInput.value, 
                age: currentUserData.age, // 원본값 업데이트
                height: heightInput.value, 
                weight: weightInput.value, 
                gender: users[userIndex].gender, 
                profilePic: settingsProfileImgDisplay.src 
            };
            profileImageChanged = false; 
            newProfileImageBase64 = null; 
            updateSaveButtonState();
        } else { alert("오류: 현재 로그인된 사용자 정보를 찾을 수 없습니다."); }
    });

if (downloadDataButton) {
    downloadDataButton.addEventListener('click', async function() {
        const usersForPdf = JSON.parse(localStorage.getItem('advisorGptUsers')) || [];
        const userForPdfData = usersForPdf.find(user => user.email === loggedInUserEmail);
        
        if (!userForPdfData) { 
            alert("PDF를 생성할 사용자 정보가 없습니다. 먼저 로그인하거나 정보를 저장해주세요."); 
            return; 
        }
        
        const { jsPDF } = window.jspdf; 
        const pdf = new jsPDF({
            orientation: 'p', // portrait
            unit: 'mm',       // millimeters
            format: 'a4'      // A4 format
        });
    }
        const base64FontData = typeof nanumGothicBase64Data !== 'undefined' ? nanumGothicBase64Data : '';
        
        try {
            if (base64FontData.trim().length >= 10000) { 
                pdf.addFileToVFS('NanumGothic-Regular.ttf', base64FontData); 
                pdf.addFont('NanumGothic-Regular.ttf', 'NanumGothic', 'normal'); 
                pdf.setFont('NanumGothic', 'normal');
            } else { 
                pdf.setFont("helvetica", "normal"); 
                if (navigator.language.startsWith('ko')) {
                    console.warn("PDF 생성 경고: 한글 폰트 데이터가 로드되지 않아 한글이 깨질 수 있습니다.");
                }
            }
        } catch (error) { 
            console.error("Error applying Korean font to PDF:", error); 
            pdf.setFont("helvetica", "normal"); 
        }

        let yPosition = 15; 
        const lineHeight = 7;  // 기본 줄 간격
        const sectionSpacing = 10; // 섹션 간 간격
        const indent = 10; 
        const contentIndent = 15; // 내용 들여쓰기
        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        const margin = 15;
        const usableWidth = pageWidth - indent - margin; // 실제 사용 가능한 텍스트 너비

        function addWrappedText(text, x, y, maxWidth, options = {}) {
            const fontSize = options.fontSize || 10;
            pdf.setFontSize(fontSize);
            const lines = pdf.splitTextToSize(text || "정보 없음", maxWidth);
            lines.forEach(line => {
                if (y > pageHeight - margin - lineHeight) { // 페이지 넘김 확인
                    pdf.addPage();
                    yPosition = margin;
                    y = yPosition;
                }
                pdf.text(line, x, y);
                y += lineHeight * (fontSize / 10); // 다음 줄 위치
            });
            yPosition = y; // 전역 yPosition 업데이트
            return yPosition;
        }
        
        yPosition = addWrappedText("AdvisorGPT 사용자 데이터 요약", indent, yPosition, usableWidth, { fontSize: 16 });
        yPosition += sectionSpacing / 2; 

        yPosition = addWrappedText(`사용자 별명: ${userForPdfData.nickname || 'User'}`, indent, yPosition, usableWidth); 
        yPosition = addWrappedText(`이메일: ${userForPdfData.email}`, indent, yPosition, usableWidth);
        yPosition = addWrappedText(`나이: ${userForPdfData.age || '-'} 세`, indent, yPosition, usableWidth); 
        yPosition = addWrappedText(`키: ${userForPdfData.height || '-'} cm`, indent, yPosition, usableWidth); 
        yPosition = addWrappedText(`몸무게: ${userForPdfData.weight || '-'} kg`, indent, yPosition, usableWidth);
        yPosition = addWrappedText(`성별: ${userForPdfData.gender || '-'}`, indent, yPosition, usableWidth);
        
        const userGoalScoreKey = 'userGoalScore_' + loggedInUserEmail;
        const goalScoreForPdf = localStorage.getItem(userGoalScoreKey) || defaultGoalScore;
        yPosition = addWrappedText(`나의 목표 평균 점수: ${goalScoreForPdf} 점`, indent, yPosition, usableWidth);
        yPosition += sectionSpacing;

        yPosition = addWrappedText("일일 기록 데이터:", indent, yPosition, usableWidth, { fontSize: 12 });
        yPosition += lineHeight / 2;

        const dailyRecordsKey = `dailyRecords_${loggedInUserEmail}`;
        const userDailyRecords = JSON.parse(localStorage.getItem(dailyRecordsKey)) || {};
        const recordDates = Object.keys(userDailyRecords).sort((a,b) => new Date(b) - new Date(a)); // 최신순 정렬

        if (recordDates.length > 0) {
            recordDates.forEach(date => {
                if (yPosition > pageHeight - margin - (lineHeight * 10) ) { // 새 기록 시작 전 페이지 넘김 여유 공간 확인
                     pdf.addPage(); yPosition = margin;
                }
                const record = userDailyRecords[date];
                yPosition = addWrappedText(`[${date}]`, indent, yPosition, usableWidth, { fontSize: 11 });
                
                if(record.log) {
                    yPosition = addWrappedText(`  수면: ${record.log.sleep_hours || 0}시간, 식사: ${record.log.calories || 0}kcal, 운동: ${(record.log.strength_minutes || 0) + (record.log.cardio_minutes || 0)}분`, contentIndent, yPosition, usableWidth - (contentIndent-indent), {fontSize: 9});
                    yPosition = addWrappedText(`  감정/스트레스: ${record.log.mood_text || "기록 없음"}`, contentIndent, yPosition, usableWidth - (contentIndent-indent), {fontSize: 9});
                }
                if(record.analysis){
                    yPosition = addWrappedText(`  건강점수: ${record.analysis.todayHealthScore || '--'}, 스트레스 지수: ${record.analysis.aiMentalAnalysis ? record.analysis.aiMentalAnalysis.stress_score : '--'}`, contentIndent, yPosition, usableWidth - (contentIndent-indent), {fontSize: 9});
                    yPosition = addWrappedText(`  점수 산출 이유: ${record.analysis.scoreReason || "내용 없음"}`, contentIndent, yPosition, usableWidth - (contentIndent-indent), {fontSize: 9});
                    if(record.analysis.aiPhysicalAnalysis) {
                        yPosition = addWrappedText(`  신체적 분석: ${record.analysis.aiPhysicalAnalysis.summary || "내용 없음"}`, contentIndent, yPosition, usableWidth - (contentIndent-indent), {fontSize: 9});
                        yPosition = addWrappedText(`  신체적 피드백: ${record.analysis.aiPhysicalAnalysis.feedback || "내용 없음"}`, contentIndent, yPosition, usableWidth - (contentIndent-indent), {fontSize: 9});
                    }
                    if(record.analysis.aiMentalAnalysis) {
                        yPosition = addWrappedText(`  정신적 분석: ${record.analysis.aiMentalAnalysis.summary || "내용 없음"}`, contentIndent, yPosition, usableWidth - (contentIndent-indent), {fontSize: 9});
                        yPosition = addWrappedText(`  정신적 피드백: ${record.analysis.aiMentalAnalysis.feedback || "내용 없음"}`, contentIndent, yPosition, usableWidth - (contentIndent-indent), {fontSize: 9});
                    }
                }
                yPosition += lineHeight / 2; // 각 날짜 기록 후 간격
            });
        } else {
            yPosition = addWrappedText("(기록된 일일 데이터 없음)", contentIndent, yPosition, usableWidth - (contentIndent-indent));
        }
        yPosition += sectionSpacing;

        yPosition = addWrappedText("주간 평균 데이터:", indent, yPosition, usableWidth, { fontSize: 12 });
        yPosition += lineHeight / 2;
        const lastWeekSummaryKey = `lastWeekSummary_${loggedInUserEmail}`;
        const lastWeekData = JSON.parse(localStorage.getItem(lastWeekSummaryKey));
        if (lastWeekData && lastWeekData.daysRecorded > 0) {
            yPosition = addWrappedText(`  [지난 주 요약 (${lastWeekData.weekStartDate} 시작, ${lastWeekData.daysRecorded}일 기록)]`, indent, yPosition, usableWidth, {fontSize: 10});
            yPosition = addWrappedText(`    평균 건강점수: ${lastWeekData.overall ? lastWeekData.overall.toFixed(1) : '-'}점`, contentIndent, yPosition, usableWidth - (contentIndent-indent), {fontSize: 9});
            yPosition = addWrappedText(`    평균 수면: ${lastWeekData.sleep ? lastWeekData.sleep.toFixed(1) : '-'}시간`, contentIndent, yPosition, usableWidth - (contentIndent-indent), {fontSize: 9});
            yPosition = addWrappedText(`    평균 식사량: ${lastWeekData.meal ? lastWeekData.meal.toFixed(0) : '-'}kcal`, contentIndent, yPosition, usableWidth - (contentIndent-indent), {fontSize: 9});
            yPosition = addWrappedText(`    평균 운동시간: ${lastWeekData.exercise ? lastWeekData.exercise.toFixed(1) : '-'}시간`, contentIndent, yPosition, usableWidth - (contentIndent-indent), {fontSize: 9});
            yPosition = addWrappedText(`    평균 스트레스 지수: ${lastWeekData.stress ? lastWeekData.stress.toFixed(0) : '-'}점`, contentIndent, yPosition, usableWidth - (contentIndent-indent), {fontSize: 9});
        } else {
            yPosition = addWrappedText("(기록된 주간 평균 데이터 없음)", contentIndent, yPosition, usableWidth - (contentIndent-indent));
        }
        yPosition += sectionSpacing;
        
        yPosition = addWrappedText("챗봇 대화 내역:", indent, yPosition, usableWidth, { fontSize: 12 }); 
        yPosition += lineHeight / 2;
        // TODO: 실제 챗봇 대화 내역 로드 로직 (현재는 플레이스홀더)
        // const chatHistoryKey = `userChatHistory_${loggedInUserEmail}`;
        // const chatHistory = JSON.parse(localStorage.getItem(chatHistoryKey)) || [];
        // if (chatHistory.length > 0) {
        //     chatHistory.forEach(chat => {
        //         yPosition = addWrappedText(`  ${chat.timestamp || ''} ${chat.sender}: ${chat.message}`, contentIndent, yPosition, usableWidth - (contentIndent-indent), {fontSize: 9});
        //     });
        // } else {
            yPosition = addWrappedText("(기록된 챗봇 대화 내역 없음 - 추후 연동 예정)", contentIndent, yPosition, usableWidth - (contentIndent-indent));
        // }
        
        pdf.save(`AdvisorGPT_데이터_${userForPdfData.nickname || 'User'}.pdf`);
    });
        // !!!! 로그아웃 버튼 이벤트 리스너 !!!!
    if (logoutButton) {
        logoutButton.addEventListener('click', function() {
            console.log("Logout button clicked"); // 디버깅용 로그
            localStorage.removeItem('loggedInUserEmail');
            localStorage.removeItem('userNickname');
            localStorage.removeItem('userProfileImage');
            // 필요에 따라 다른 세션 관련 정보도 삭제
            alert('로그아웃 되었습니다.');
            window.location.href = '../Advisor_login/index.html';
        });
    } else {
        console.error("Logout button not found!");
    }

    // !!!! 계정 탈퇴 버튼 이벤트 리스너 !!!!
    if (deleteAccountButton) {
        deleteAccountButton.addEventListener('click', function() {
            console.log("Delete account button clicked"); // 디버깅용 로그
            if (!loggedInUserEmail) { // 함수 시작 시점에 loggedInUserEmail 다시 확인
                alert("로그인 정보가 없어 계정을 탈퇴할 수 없습니다.");
                return;
            }

            const confirmation = confirm("정말로 계정을 탈퇴하시겠습니까? 이 작업은 되돌릴 수 없으며, 모든 사용자 데이터가 삭제됩니다.");

            if (confirmation) {
                console.log("User confirmed account deletion for:", loggedInUserEmail);
                let users = JSON.parse(localStorage.getItem('advisorGptUsers')) || [];
                const remainingUsers = users.filter(user => user.email !== loggedInUserEmail);
                localStorage.setItem('advisorGptUsers', JSON.stringify(remainingUsers));
                console.log("User removed from advisorGptUsers array.");

                // 해당 사용자와 관련된 모든 개별 localStorage 항목 삭제
                localStorage.removeItem('userProfileImage_' + loggedInUserEmail);
                localStorage.removeItem('userGoalScore_' + loggedInUserEmail);
                localStorage.removeItem(`dailyRecords_${loggedInUserEmail}`); 
                localStorage.removeItem(`lastRecordDate_${loggedInUserEmail}`); 
                localStorage.removeItem(`lastWeekSummaryProcessedForWeekStart_${loggedInUserEmail}`); 
                localStorage.removeItem(`lastWeekSummary_${loggedInUserEmail}`); 
                // TODO: 챗봇 대화 내역 등 다른 사용자별 데이터 키가 있다면 여기에 삭제 로직 추가
                // 예: localStorage.removeItem(`userChatHistory_${loggedInUserEmail}`);
                console.log("User-specific data removed from localStorage.");

                // 현재 로그인 상태 정보도 삭제
                localStorage.removeItem('loggedInUserEmail');
                localStorage.removeItem('userNickname');
                localStorage.removeItem('userProfileImage'); 
                console.log("Current login session data removed.");
                
                alert("계정이 성공적으로 탈퇴되었습니다. 로그인 화면으로 이동합니다.");
                window.location.href = '../Advisor_login/index.html';
            } else {
                console.log("User cancelled account deletion.");
            }
        });
    } else {
        console.error("Delete account button not found!");
    }

    // --- 초기 실행 ---
    if (loadUserData()) { // 사용자 데이터 로드가 성공했을 때만 다음 초기화 진행
        // 사이드바 활성화 로직
        const currentSettingsPath = "settings.html"; 
        const sidebarMenuLinks = document.querySelectorAll('#sidebar-menu li a');
        sidebarMenuLinks.forEach(link => { link.parentElement.classList.remove('active'); });
        const settingsLink = Array.from(sidebarMenuLinks).find(a => {
            const linkHref = a.getAttribute('href'); 
            const iconSrc = a.parentElement.querySelector('.menu-icon') ? a.parentElement.querySelector('.menu-icon').src : '';
            return (linkHref && linkHref.includes(currentSettingsPath)) || 
                   (linkHref === "../Settings_Page/settings.html") || 
                   (linkHref === "#" && iconSrc.includes('icon_settings'));
        });
        if (settingsLink) { 
            settingsLink.parentElement.classList.add('active');
        } else { 
            document.querySelector('#sidebar-menu li a[href*="settings.html"]')?.parentElement.classList.add('active'); 
        }
    }
});
