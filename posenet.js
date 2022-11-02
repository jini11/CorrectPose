const video = document.getElementById("video");
const canvas = document.getElementById("canvas");
const context = canvas.getContext("2d");

const result_label = document.getElementById("result_label");
let pose_status = 2;
let keep_time = [0, 0, 0];
let result_message = "";

//position = ["코", "왼쪽눈", "오른쪽눈", "왼쪽귀", "오른쪽귀", "왼쪽어깨", "오른쪽어깨", "왼쪽팔꿈치", "오른쪽팔꿈치",
 //           "왼쪽손목", "오른쪽손목", "왼쪽골반부위", "오른쪽골반부위", "왼쪽무릎", "오른쪽무릎", "왼쪽발목", "오른쪽발목"];

// 척추상 : Spine At The Shoulder , 척추중 : Middle Of The Spine , 척추하 : Base Of Spine
//spine_position = ["척추상", "척추중", "척추하", "목"];

//let spinetopX, spineTopY, spineBottomX, spineBottomY, spineMiddleX, spineMiddleY;

//webcam을 enable하는 코드
navigator.mediaDevices.getUserMedia({video: true, audio: false}).then(function (stream) {
    video.srcObject = stream;
});

//then 안쪽이 function(model){} 이렇게 쓰는거랑 같다 (인자가 하나라 중괄호가 없는 것)
posenet.load().then((model) => {
    // 이곳의 model과 아래 predict의 model은 같아야 한다.
    video.onloadeddata = (e) => {
        //비디오가 load된 다음에 predict하도록. (안하면 콘솔에 에러뜸)
        predict();
    };

    function predict() {
        //frame이 들어올 때마다 estimate를 해야하니 함수화 시킴
        model.estimateSinglePose(video).then((pose) => {
            canvas.width = video.width; //캔버스와 비디오의 크기를 일치시킴
            canvas.height = video.height;
            
            //spineTop
            leftShoulder = pose.keypoints[5].position;
            rightShoulder = pose.keypoints[6].position;

            // leftShoulderX = pose.keypoints[5].position.x;
            // leftShoulderY = pose.keypoints[5].position.y;
            // rightShoulderX = pose.keypoints[6].position.x;
            // rightShoulderY = pose.keypoints[6].position.y;
            spineTopX = (leftShoulder.x + rightShoulder.x) / 2;
            spineTopY = (leftShoulder.y + rightShoulder.y) / 2;
            scale = 1;

            //spineBottom
            leftHip = pose.keypoints[11].position;
            rightHip = pose.keypoints[12].position;

            // leftHipX = pose.keypoints[11].position.x;
            // leftHipY = pose.keypoints[11].position.y;
            // rightHipX = pose.keypoints[12].position.x;
            // rightHipY = pose.keypoints[12].position.y;
            spineBottomX = (leftHip.x + rightHip.x) / 2;
            spineBottomY = (leftHip.y + rightHip.y) / 2;

            //spineMiddle
            spineMiddleX = (spineBottomX + spineTopX) / 2;
            spineMiddleY = (spineBottomY + spineTopY) / 2;            
                     
            spine = [spineTopX, spineTopY, spineBottomX, spineBottomY, spineMiddleX, spineMiddleY];

            //spineTop
            drawPoint(context, spineTopY, spineTopX, 3, color); //////////                      keypoint!!!!!!!!!!!!!!!!!!!
            drawPoint(context, spineBottomY, spineBottomX, 3, color);
            drawPoint(context, spineMiddleY, spineMiddleX, 3, color);
            //spine = [spineTop.position, spineBottom.position];
            //pose.keypoints.push.apply(pose.keypoints, spine); // push.apply -> array + array
            //pose.keypoints = Object.assign(pose.keypoints, spine); // Object.assign -> object + object
            
            
            drawKeypoints(pose.keypoints, 0.6, context);
            drawSkeleton(pose.keypoints, 0.6, context);

            //console.log("spineTop and Bottom differance: " + (spineTopX - spineBottomX)); // -7~-16 -> 15 or 20
            //console.log("shoulder and ear differance: " + (pose.keypoints[4].position.x - pose.keypoints[6].position.x)); //-1~8 avg: 4? -> 10
            checkPose(pose, spine);
        });
        requestAnimationFrame(predict); //frame이 들어올 때마다 재귀호출
    }
});

/* Timer */
let count_time = setInterval(function () {
    if (keep_time[pose_status] == 0) {
        //다른 모션에서 바뀌어 들어옴
        keep_time[0] = keep_time[1] = keep_time[2] = 0;
        keep_time[pose_status]++;
    } else {
        // if (pose_status == 0)
        //     window.parent.postMessage({message: `목을 ${keep_time[pose_status]}초 교정하세요.`}, "*");
        // else if (pose_status == 1)
        //     window.parent.postMessage({message: `허리를 ${keep_time[pose_status]}초 유지하셨습니다.`}, "*");
        //else if (pose_status == 2) window.parent.postMessage({message: `정상 자세입니다.`}, "*");
        // if (keep_time[pose_status] == 10) {
        //     if (pose_status == 0) {
        //         if (pose_status == 0) {
        //             result_message = "거북목이 진행 중";
        //         } else if (pose_status == 1) {
        //             result_message = "거북목 심각 상태";
        //         } else if (pose_status == 2) {
        //             result_message = "정상";
        //         }
        //         clearInterval(count_time);
        //         window.parent.postMessage(result_message, "*");
        //     }
        // }
        if (pose_status != 2 && keep_time[pose_status] == 10) {
            if (pose_status == 0) {
                result_message = "거북목이 진행 중";
            } else {
                result_message = "거북목 심각 상태";
            }
            clearInterval(count_time);
            window.parent.postMessage(result_message, "*");
        } else if (pose_status == 2 && keep_time[pose_status] == 10) {
            result_message = "정상";
            clearInterval(count_time);
            window.parent.postMessage(result_message, "*");
        }
        keep_time[pose_status]++; //시간은 항상 세고 있다.
    }
}, 1000);

function checkPose(pose, spine) {
    if(checkNeck25(pose)) {
        pose_status = 0;
        //console.log("목 교정");
    } else if (checkNeck50(pose)) {
        pose_status = 1;
    }
    // else if(checkSpine(spine)) {
    //     pose_status = 1;
    //     //console.log("허리 교정");
    // } 
    else {
        pose_status = 2;
        //console.log("정상 자세");
    }
    console.log(pose_status);
}

function checkNeck(pose) {
    rightShoulder = pose.keypoints[6].position;
    rightEar = pose.keypoints[4].position;
    leftShoulder = pose.keypoints[5].position;
    leftEar = pose.keypoints[3].position;

    if(Math.abs(rightShoulder.x - rightEar.x) > 100) {
        return true;
    } else if(Math.abs(leftShoulder.x - leftEar.x) > 100) {
        return true;
    } else {
        return false;
    }
}

function checkNeck25(pose) { 
    rightShoulder = pose.keypoints[6].position;
    rightEar = pose.keypoints[4].position;
    
    return rightEar.x - rightShoulder.x > 25 && rightEar.x - rightShoulder.x < 50;
}

function checkNeck50(pose) {
    rightShoulder = pose.keypoints[6].position;
    rightEar = pose.keypoints[4].position;

    return rightEar.x - rightShoulder.x >= 50;
}

function checkSpine(spine) { // spineTop, spineBottom
    spineTop = spine[0];
    spineBottom = spine[2];
    if(Math.abs(spineTop - spineBottom) > 15) {
        return true;
    } else
        return false;
}

/* PoseNet을 쓰면서 사용하는 함수들 코드 - 그냥 복사해서 쓰기 */
//tensorflow에서 제공하는 js 파트
const color = "aqua";
const boundingBoxColor = "red";
const lineWidth = 2;
function toTuple({y, x}) {
    return [y, x];
}

function drawPoint(ctx, y, x, r, color) {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, 2 * Math.PI);
    ctx.fillStyle = color;
    ctx.fill();
}

function drawSegment([ay, ax], [by, bx], color, scale, ctx) {
    ctx.beginPath();
    ctx.moveTo(ax * scale, ay * scale);
    ctx.lineTo(bx * scale, by * scale);
    ctx.lineWidth = lineWidth;
    ctx.strokeStyle = color;
    ctx.stroke();
}

function drawSkeleton(keypoints, minConfidence, ctx, scale = 1) {
    const adjacentKeyPoints = posenet.getAdjacentKeyPoints(keypoints, minConfidence);
    adjacentKeyPoints.forEach((keypoints) => {
        drawSegment(toTuple(keypoints[0].position), toTuple(keypoints[1].position), color, scale, ctx);
    });
}

function drawKeypoints(keypoints, minConfidence, ctx, scale = 1) {

    for (let i = 0; i < keypoints.length; i++) {
        const keypoint = keypoints[i];
        //console.log(keypoint);
        if (keypoint.score < minConfidence) {
            continue;
        }
        const {y, x} = keypoint.position;
        drawPoint(ctx, y * scale, x * scale, 3, color);
    }
}

function drawBoundingBox(keypoints, ctx) {
    const boundingBox = posenet.getBoundingBox(keypoints);
    ctx.rect(
        boundingBox.minX,
        boundingBox.minY,
        boundingBox.maxX - boundingBox.minX,
        boundingBox.maxY - boundingBox.minY
    );
    ctx.strokeStyle = boundingBoxColor;
    ctx.stroke();
}