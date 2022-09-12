const video = document.getElementById("video");
const canvas = document.getElementById("canvas");
const context = canvas.getContext("2d");

const result_label = document.getElementById("result_label");
let pose_status = 2;
let keep_time = [0, 0, 0];
let result_message = "";

position = ["코", "왼쪽눈", "오른쪽눈", "왼쪽귀", "오른쪽귀", "왼쪽어깨", "오른쪽어깨", "왼쪽팔꿈치", "오른쪽팔꿈치",
            "왼쪽손목", "오른쪽손목", "왼쪽골반부위", "오른쪽골반부위", "왼쪽무릎", "오른쪽무릎", "왼쪽발목", "오른쪽발목"];

// 척추상 : Spine At The Shoulder , 척추중 : Middle Of The Spine , 척추하 : Base Of Spine
spine_position = ["척추상", "척추중", "척추하", "목"];

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
            leftShoulderX = pose.keypoints[5].position.x;
            leftShoulderY = pose.keypoints[5].position.y;
            rightShoulderX = pose.keypoints[6].position.x;
            rightShoulderY = pose.keypoints[6].position.y;
            spineTopX = (leftShoulderX + rightShoulderX) / 2;
            spineTopY = (leftShoulderY + rightShoulderY) / 2;
            scale = 1;

            //spineBottom
            leftHipX = pose.keypoints[11].position.x;
            leftHipY = pose.keypoints[11].position.y;
            rightHipX = pose.keypoints[12].position.x;
            rightHipY = pose.keypoints[12].position.y;
            spineBottomX = (leftHipX + rightHipX) / 2;
            spineBottomY = (leftHipY + rightHipY) / 2;

            //spineMiddle
            spineMiddleX = (spineBottomX + spineTopX) / 2;
            spineMiddleY = (spineBottomY + spineTopY) / 2;            
                       
            //spineTop
            drawPoint(context, spineTopY * scale, spineTopX * scale, 3, color); //////////                      keypoint!!!!!!!!!!!!!!!!!!!
            drawPoint(context, spineBottomY * scale, spineBottomX * scale, 3, color);
            drawPoint(context, spineMiddleY * scale, spineMiddleX * scale, 3, color);
            //spine = [spineTop.position, spineBottom.position];
            //pose.keypoints.push.apply(pose.keypoints, spine); // push.apply -> array + array
            //pose.keypoints = Object.assign(pose.keypoints, spine); // Object.assign -> object + object
            
            
            
            drawKeypoints(pose.keypoints, 0.6, context);
            drawSkeleton(pose.keypoints, 0.6, context);

        });
        requestAnimationFrame(predict); //frame이 들어올 때마다 재귀호출
    }
});

function check_X(pose) {
    head = pose.keypoints[0].position; //머리(코)
    rw = pose.keypoints[10].position; //오른쪽 손목
    re = pose.keypoints[8].position; //오른쪽 팔꿈치
    rs = pose.keypoints[6].position; //오른쪽 어깨
    lw = pose.keypoints[9].position; //왼쪽 손목
    le = pose.keypoints[7].position; //왼쪽 팔꿈치
    ls = pose.keypoints[5].position; //왼쪽 어깨
    b = pose.keypoints[12].position; //body(오른쪽 골반)
    //골반보다 팔꿈치가 위쪽에 위치, 팔꿈치보다 손목이 위쪽에 위치, 손목보다 머리가 위쪽에 위치
    if (b.y > le.y && b.y > re.y && le.y > lw.y && re.y > rw.y && lw.y > head.y && rw.y > head.y) {
        //어깨 안쪽으로 손목이 위치
        if (rs.x < rw.x || lw.x < ls.x) {
            r_gradient = -1;
            l_gradient = 1;
            if (rw.x - re.x != 0) {
                r_gradient = (rw.y - re.y) / (rw.x - re.x);
            }
            if (lw.x - le.x != 0) {
                l_gradient = (lw.y - le.y) / (lw.x - le.x);
            }
            if (r_gradient < 0 || l_gradient > 0) {
                return true;
            } else {
                return false;
            }
        } else {
            return false;
        }
    } else {
        return false;
    }
}

function getAverage(pos, n) {
    x, y = 0, 0

    for(let i=0;i<n;i++) {
        x += pos[i][0]
        y += pos[i][1]
    }
    return [x/n, y/n];
}

function getAverage2([ax, ay], [bx, by]) {
    x, y = 0, 0;

    x = ax + bx;
    y = ay + by;

    return [x/2, y/2];
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