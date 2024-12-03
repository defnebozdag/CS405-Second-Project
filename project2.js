
/**
 * @Instructions
 *      @task1 : Complete the setTexture function to handle non power of 2 sized textures
 *      @task2 : Implement the lighting by modifying the fragment shader, constructor,
 *      @task3: 
 *      @task4: 
 *      setMesh, draw, setAmbientLight, setSpecularLight and enableLighting functions 
 */


function GetModelViewProjection(projectionMatrix, translationX, translationY, translationZ, rotationX, rotationY) {
    
    var trans1 = [
        1, 0, 0, 0,
        0, 1, 0, 0,
        0, 0, 1, 0,
        translationX, translationY, translationZ, 1
    ];
    var rotatXCos = Math.cos(rotationX);
    var rotatXSin = Math.sin(rotationX);

    var rotatYCos = Math.cos(rotationY);
    var rotatYSin = Math.sin(rotationY);

    var rotatx = [
        1, 0, 0, 0,
        0, rotatXCos, -rotatXSin, 0,
        0, rotatXSin, rotatXCos, 0,
        0, 0, 0, 1
    ]

    var rotaty = [
        rotatYCos, 0, -rotatYSin, 0,
        0, 1, 0, 0,
        rotatYSin, 0, rotatYCos, 0,
        0, 0, 0, 1
    ]

    var test1 = MatrixMult(rotaty, rotatx);
    var test2 = MatrixMult(trans1, test1);
    var mvp = MatrixMult(projectionMatrix, test2);

    return mvp;
}


class MeshDrawer {
    // The constructor is a good place for taking care of the necessary initializations.
    constructor() {
        this.prog = InitShaderProgram(meshVS, meshFS);
        this.mvpLoc = gl.getUniformLocation(this.prog, 'mvp');
        this.showTexLoc = gl.getUniformLocation(this.prog, 'showTex');

        this.colorLoc = gl.getUniformLocation(this.prog, 'color');

        this.vertPosLoc = gl.getAttribLocation(this.prog, 'pos');
        this.texCoordLoc = gl.getAttribLocation(this.prog, 'texCoord');

        this.vertbuffer = gl.createBuffer();
        this.texbuffer = gl.createBuffer();

        this.numTriangles = 0;

        /**
         * @Task2 : You should initialize the required variables for lighting here
         */
        this.normalLoc = gl.getAttribLocation(this.prog, 'normal');
        this.normalBuffer = gl.createBuffer();

        this.enableLightingLoc = gl.getUniformLocation(this.prog, 'enableLighting');
        this.lightPosLoc = gl.getUniformLocation(this.prog, 'lightPos');
        this.ambientLoc = gl.getUniformLocation(this.prog, 'ambient');

        this.enableLightingValue = false;
        this.ambientValue = 0.5;
		
		this.specularIntensityLoc = gl.getUniformLocation(this.prog, 'specularIntensity');
		this.specularIntensityValue = 0.5;

		this.textures = []; // Array to store multiple textures
		this.secondTexture = false; // Flag to enable second texture


    }

    setMesh(vertPos, texCoords, normalCoords) {
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vertbuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertPos), gl.STATIC_DRAW);

        // update texture coordinates
        gl.bindBuffer(gl.ARRAY_BUFFER, this.texbuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(texCoords), gl.STATIC_DRAW);

        this.numTriangles = vertPos.length / 3;

        /**
         * @Task2 : You should update the rest of this function to handle the lighting
         */
        // Bind and buffer normal data
        gl.bindBuffer(gl.ARRAY_BUFFER, this.normalBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normalCoords), gl.STATIC_DRAW);
    }

    // This method is called to draw the triangular mesh.
    // The argument is the transformation matrix, the same matrix returned
    // by the GetModelViewProjection function above.
    draw(trans) {
        gl.useProgram(this.prog);

        gl.uniformMatrix4fv(this.mvpLoc, false, trans);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.vertbuffer);
        gl.enableVertexAttribArray(this.vertPosLoc);
        gl.vertexAttribPointer(this.vertPosLoc, 3, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.texbuffer);
        gl.enableVertexAttribArray(this.texCoordLoc);
        gl.vertexAttribPointer(this.texCoordLoc, 2, gl.FLOAT, false, 0, 0);

        /**
         * @Task2 : You should update this function to handle the lighting
         */
        // Bind and set up the normal attribute
        gl.bindBuffer(gl.ARRAY_BUFFER, this.normalBuffer);
        gl.enableVertexAttribArray(this.normalLoc);
        gl.vertexAttribPointer(this.normalLoc, 3, gl.FLOAT, false, 0, 0);

        // Set the uniform values for lighting
        gl.uniform1i(this.enableLightingLoc, this.enableLightingValue);
        gl.uniform1f(this.ambientLoc, this.ambientValue);
        gl.uniform1f(this.specularIntensityLoc, this.specularIntensityValue);
        gl.uniform1f(this.shininessLoc, this.shininessValue);

        // Update light position
        updateLightPos();

        // Set the light position uniform
        gl.uniform3f(this.lightPosLoc, lightX, lightY, 1.0);

		// Task 4: Bind multiple textures
		if (this.secondTexture && this.textures.length >= 2) {
			gl.activeTexture(gl.TEXTURE0);
			gl.bindTexture(gl.TEXTURE_2D, this.textures[0]);
			gl.uniform1i(gl.getUniformLocation(this.prog, 'tex'), 0);
			
			gl.activeTexture(gl.TEXTURE1);
			gl.bindTexture(gl.TEXTURE_2D, this.textures[1]);
			gl.uniform1i(gl.getUniformLocation(this.prog, 'tex2'), 1);
		} else if (this.textures.length > 0) {
			gl.activeTexture(gl.TEXTURE0);
			gl.bindTexture(gl.TEXTURE_2D, this.textures[0]);
			gl.uniform1i(gl.getUniformLocation(this.prog, 'tex'), 0);
		}

        gl.drawArrays(gl.TRIANGLES, 0, this.numTriangles);
    }

    // This method is called to set the texture of the mesh.
    // The argument is an HTML IMG element containing the texture data.
    setTexture(img) {
        const texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, texture);

        // You can set the texture image data using the following command.
        gl.texImage2D(
            gl.TEXTURE_2D,
            0,
            gl.RGB,
            gl.RGB,
            gl.UNSIGNED_BYTE,
            img);

        // Set texture parameters 
        if (isPowerOf2(img.width) && isPowerOf2(img.height)) {
            gl.generateMipmap(gl.TEXTURE_2D);
        } else {
            console.error("Task 1: Non power of 2, you should implement this part to accept non power of 2 sized textures");
            /**
             * @Task1 : You should implement this part to accept non power of 2 sized textures
             */
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        }

		this.textures[index] = texture;

    }

    showTexture(show) {
        gl.useProgram(this.prog);
        gl.uniform1i(this.showTexLoc, show);
    }

    enableLighting(show) {
        /**
         * @Task2 : You should implement the lighting and implement this function
         */
        this.enableLightingValue = show;
    }
    
    setAmbientLight(ambient) {
        /**
         * @Task2 : You should implement the lighting and implement this function
         */
        this.ambientValue = ambient;
    }
	
	setSpecularLight(intensity) {
		this.specularIntensityValue = intensity;
	}
	enableSecondTexture(enable) {
		this.secondTexture = enable;
	}
	
}


function isPowerOf2(value) {
    return (value & (value - 1)) == 0;
}

function normalize(v, dst) {
    dst = dst || new Float32Array(3);
    var length = Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
    // make sure we don't divide by 0.
    if (length > 0.00001) {
        dst[0] = v[0] / length;
        dst[1] = v[1] / length;
        dst[2] = v[2] / length;
    }
    return dst;
}

// Vertex shader source code
const meshVS = `
            attribute vec3 pos; 
            attribute vec2 texCoord; 
            attribute vec3 normal;

            uniform mat4 mvp; 

            varying vec2 v_texCoord; 
            varying vec3 v_normal; 
            varying vec3 v_pos;

            void main()
            {
                v_texCoord = texCoord;
                v_normal = normal;
                v_pos = pos;

                gl_Position = mvp * vec4(pos,1);
            }`;

// Fragment shader source code
/**
 * @Task2 : You should update the fragment shader to handle the lighting
 */
const meshFS = `
            precision mediump float;

            uniform bool showTex;
            uniform bool enableLighting;
            uniform sampler2D tex;
            uniform sampler2D tex2;
            uniform vec3 color; 
            uniform vec3 lightPos;
            uniform float ambient;
            uniform float specularIntensity;

            varying vec2 v_texCoord;
            varying vec3 v_normal;
            varying vec3 v_pos;

            void main()
            {
                vec4 texColor1 = texture2D(tex, v_texCoord);
                vec4 texColor2 = texture2D(tex2, v_texCoord);
                vec3 normal = normalize(v_normal);
                vec3 lightDir = normalize(lightPos - v_pos);
                vec3 viewDir = normalize(-v_pos);
                vec3 reflectDir = reflect(-lightDir, normal);
                
                float diff = max(dot(normal, lightDir), 0.0);
                float spec = pow(max(dot(viewDir, reflectDir), 0.0), 32.0);
                
                vec3 ambientComponent = ambient * texColor1.rgb;
                vec3 diffuseComponent = diff * texColor1.rgb;
                vec3 specularComponent = specularIntensity * spec * vec3(1.0);
                vec3 finalColor;

                if (enableLighting) {
                    finalColor = ambientComponent + diffuseComponent + specularComponent;
                    if (showTex) {
                        finalColor = mix(finalColor, texColor2.rgb, 0.5);
                    }
                } else {
                    finalColor = texColor1.rgb;
                }

                gl_FragColor = vec4(finalColor, texColor1.a);
            }`;

// Light direction parameters for Task 2
var lightX = 1;
var lightY = 1;

const keys = {};
function updateLightPos() {
    const translationSpeed = 1;
    if (keys['ArrowUp']) lightY -= translationSpeed;
    if (keys['ArrowDown']) lightY += translationSpeed;
    if (keys['ArrowRight']) lightX -= translationSpeed;
    if (keys['ArrowLeft']) lightX += translationSpeed;
}
///////////////////////////////////////////////////////////////////////////////////

