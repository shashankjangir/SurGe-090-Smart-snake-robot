// Fluid solver adapted from the user-supplied Originkit Fluid Trail.
// The hero snake supplies positions; this effect has no pointer listeners or animation loop.
(function (root) {
  'use strict';
function parseColor(c        )                           {
    if (!c) return [0.4, 0.4, 0.4]
    const m = c.match(/rgba?\(([^)]+)\)/i)
    if (m) {
        const p = m[1].split(",").map((v) => parseFloat(v))
        return [(p[0] || 0) / 255, (p[1] || 0) / 255, (p[2] || 0) / 255]
    }
    let h = c.replace("#", "").trim()
    if (h.length === 3)
        h = h
            .split("")
            .map((x) => x + x)
            .join("")
    const r = parseInt(h.slice(0, 2), 16) / 255
    const g = parseInt(h.slice(2, 4), 16) / 255
    const b = parseInt(h.slice(4, 6), 16) / 255
    return [r || 0, g || 0, b || 0]
}

// Fixed simulation constants — no customization.
const SPLAT_FORCE = 6000
const PRESSURE_ITERATIONS = 20
const CURL_STRENGTH = 30
const SIM_RESOLUTION = 128
const DYE_RESOLUTION = 512

const VS = `#version 300 es
in vec2 a_pos;
out vec2 v_uv;
void main() {
    v_uv = a_pos * 0.5 + 0.5;
    gl_Position = vec4(a_pos, 0.0, 1.0);
}`

const FS_ADVECT = `#version 300 es
precision highp float;
in vec2 v_uv;
uniform sampler2D u_velocity;
uniform sampler2D u_source;
uniform vec2 u_texel;
uniform float u_dt;
uniform float u_dissipation;
uniform float u_outward;
out vec4 outColor;
void main() {
    vec2 coord = v_uv - u_dt * texture(u_velocity, v_uv).xy * u_texel;
    // Fade outside: sample toward centre so dye drifts outward as it fades.
    if (u_outward > 0.0) coord -= (v_uv - vec2(0.5)) * u_outward;
    outColor = u_dissipation * texture(u_source, coord);
}`

const FS_SPLAT = `#version 300 es
precision highp float;
in vec2 v_uv;
uniform sampler2D u_target;
uniform vec2 u_point;
uniform vec3 u_color;
uniform float u_radius;
uniform float u_aspect;
uniform float u_radial;
out vec4 outColor;
void main() {
    vec2 p = v_uv - u_point;
    p.x *= u_aspect;
    float falloff = exp(-dot(p, p) / u_radius);
    vec3 splat = falloff * u_color;
    // Radial outward push — fluid at the cursor gets shoved away from
    // centre so existing waves visibly collide with the cursor and spread.
    float plen = length(p);
    vec2 rdir = plen > 0.0001 ? p / plen : vec2(0.0);
    float rmag = length(u_color.xy) * 1.5;
    splat.xy += u_radial * rdir * falloff * rmag;
    vec3 base = texture(u_target, v_uv).xyz;
    outColor = vec4(base + splat, 1.0);
}`

const FS_DIVERGENCE = `#version 300 es
precision highp float;
in vec2 v_uv;
uniform sampler2D u_velocity;
uniform vec2 u_texel;
out vec4 outColor;
void main() {
    float L = texture(u_velocity, v_uv - vec2(u_texel.x, 0.0)).x;
    float R = texture(u_velocity, v_uv + vec2(u_texel.x, 0.0)).x;
    float B = texture(u_velocity, v_uv - vec2(0.0, u_texel.y)).y;
    float T = texture(u_velocity, v_uv + vec2(0.0, u_texel.y)).y;
    vec2 C = texture(u_velocity, v_uv).xy;
    if (v_uv.x < u_texel.x) L = -C.x;
    if (v_uv.x > 1.0 - u_texel.x) R = -C.x;
    if (v_uv.y < u_texel.y) B = -C.y;
    if (v_uv.y > 1.0 - u_texel.y) T = -C.y;
    outColor = vec4(0.5 * (R - L + T - B), 0.0, 0.0, 1.0);
}`

const FS_CURL = `#version 300 es
precision highp float;
in vec2 v_uv;
uniform sampler2D u_velocity;
uniform vec2 u_texel;
out vec4 outColor;
void main() {
    float L = texture(u_velocity, v_uv - vec2(u_texel.x, 0.0)).y;
    float R = texture(u_velocity, v_uv + vec2(u_texel.x, 0.0)).y;
    float B = texture(u_velocity, v_uv - vec2(0.0, u_texel.y)).x;
    float T = texture(u_velocity, v_uv + vec2(0.0, u_texel.y)).x;
    outColor = vec4(R - L - T + B, 0.0, 0.0, 1.0);
}`

const FS_VORTICITY = `#version 300 es
precision highp float;
in vec2 v_uv;
uniform sampler2D u_velocity;
uniform sampler2D u_curl;
uniform vec2 u_texel;
uniform float u_curlStrength;
uniform float u_dt;
out vec4 outColor;
void main() {
    float L = texture(u_curl, v_uv - vec2(u_texel.x, 0.0)).x;
    float R = texture(u_curl, v_uv + vec2(u_texel.x, 0.0)).x;
    float B = texture(u_curl, v_uv - vec2(0.0, u_texel.y)).x;
    float T = texture(u_curl, v_uv + vec2(0.0, u_texel.y)).x;
    float C = texture(u_curl, v_uv).x;
    vec2 force = 0.5 * vec2(abs(T) - abs(B), abs(L) - abs(R));
    force /= length(force) + 0.0001;
    force *= u_curlStrength * C;
    force.y *= -1.0;
    vec2 vel = texture(u_velocity, v_uv).xy;
    vel += force * u_dt;
    vel = clamp(vel, -1000.0, 1000.0);
    outColor = vec4(vel, 0.0, 1.0);
}`

const FS_PRESSURE = `#version 300 es
precision highp float;
in vec2 v_uv;
uniform sampler2D u_pressure;
uniform sampler2D u_divergence;
uniform vec2 u_texel;
out vec4 outColor;
void main() {
    float L = texture(u_pressure, v_uv - vec2(u_texel.x, 0.0)).x;
    float R = texture(u_pressure, v_uv + vec2(u_texel.x, 0.0)).x;
    float B = texture(u_pressure, v_uv - vec2(0.0, u_texel.y)).x;
    float T = texture(u_pressure, v_uv + vec2(0.0, u_texel.y)).x;
    float d = texture(u_divergence, v_uv).x;
    outColor = vec4((L + R + B + T - d) * 0.25, 0.0, 0.0, 1.0);
}`

const FS_GRADIENT_SUB = `#version 300 es
precision highp float;
in vec2 v_uv;
uniform sampler2D u_pressure;
uniform sampler2D u_velocity;
uniform vec2 u_texel;
out vec4 outColor;
void main() {
    float L = texture(u_pressure, v_uv - vec2(u_texel.x, 0.0)).x;
    float R = texture(u_pressure, v_uv + vec2(u_texel.x, 0.0)).x;
    float B = texture(u_pressure, v_uv - vec2(0.0, u_texel.y)).x;
    float T = texture(u_pressure, v_uv + vec2(0.0, u_texel.y)).x;
    vec2 v = texture(u_velocity, v_uv).xy;
    v -= 0.5 * vec2(R - L, T - B);
    outColor = vec4(v, 0.0, 1.0);
}`

const FS_DISPLAY = `#version 300 es
precision highp float;
in vec2 v_uv;
uniform sampler2D u_tex;
out vec4 outColor;
void main() {
    vec3 c = texture(u_tex, v_uv).rgb;
    // Alpha from dye intensity → empty areas stay transparent (no background).
    float a = clamp(max(c.r, max(c.g, c.b)), 0.0, 1.0);
    outColor = vec4(c / max(max(c.r, max(c.g, c.b)), 0.0001), a);
}`

const FS_CLEAR = `#version 300 es
precision highp float;
in vec2 v_uv;
uniform sampler2D u_tex;
uniform float u_value;
out vec4 outColor;
void main() {
    outColor = u_value * texture(u_tex, v_uv);
}`

function compileShader(
    gl                        ,
    type        ,
    src
)                     {
    const s = gl.createShader(type)
    if (!s) return null
    gl.shaderSource(s, src)
    gl.compileShader(s)
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
        // eslint-disable-next-line no-console
        console.error(gl.getShaderInfoLog(s))
        gl.deleteShader(s)
        return null
    }
    return s
}

function buildProgram(
    gl                        ,
    vsSrc        ,
    fsSrc
)                      {
    const vs = compileShader(gl, gl.VERTEX_SHADER, vsSrc)
    const fs = compileShader(gl, gl.FRAGMENT_SHADER, fsSrc)
    if (!vs || !fs) {
        if (vs) gl.deleteShader(vs)
        if (fs) gl.deleteShader(fs)
        return null
    }
    const p = gl.createProgram()
    if (!p) {
        gl.deleteShader(vs)
        gl.deleteShader(fs)
        return null
    }
    gl.attachShader(p, vs)
    gl.attachShader(p, fs)
    gl.linkProgram(p)
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
        // eslint-disable-next-line no-console
        console.error(gl.getProgramInfoLog(p))
        gl.deleteProgram(p)
        gl.deleteShader(vs)
        gl.deleteShader(fs)
        return null
    }
    gl.deleteShader(vs)
    gl.deleteShader(fs)
    return p
}

function createFBO(
    gl                        ,
    w        ,
    h        ,
    internalFormat        ,
    format        ,
    type        ,
    filter
) {
    const tex = gl.createTexture()
    gl.bindTexture(gl.TEXTURE_2D, tex)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat, w, h, 0, format, type, null)
    const fbo = gl.createFramebuffer()
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo)
    gl.framebufferTexture2D(
        gl.FRAMEBUFFER,
        gl.COLOR_ATTACHMENT0,
        gl.TEXTURE_2D,
        tex,
        0
    )
    if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) {
        gl.deleteTexture(tex)
        gl.deleteFramebuffer(fbo)
        throw new Error('Unsupported fluid framebuffer')
    }
    gl._fluidTargets.push({ tex, fbo })
    gl.viewport(0, 0, w, h)
    gl.clearColor(0, 0, 0, 0)
    gl.clear(gl.COLOR_BUFFER_BIT)
    return {
        tex,
        fbo,
        w,
        h,
        texel: [1 / w, 1 / h]                    ,
        attach(unit        ) {
            gl.activeTexture(gl.TEXTURE0 + unit)
            gl.bindTexture(gl.TEXTURE_2D, tex)
            return unit
        },
    }
}

function createDoubleFBO(
    gl                        ,
    w        ,
    h        ,
    internalFormat        ,
    format        ,
    type        ,
    filter
) {
    let read = createFBO(gl, w, h, internalFormat, format, type, filter)
    let write = createFBO(gl, w, h, internalFormat, format, type, filter)
    return {
        get read() {
            return read
        },
        get write() {
            return write
        },
        swap() {
            const t = read
            read = write
            write = t
        },
        w,
        h,
        texel: read.texel,
    }
}


  root.createHeroFluidTrail = function (canvas) {
    const gl = canvas.getContext('webgl2', { alpha: true, depth: false, stencil: false,
      antialias: false, premultipliedAlpha: false });
    if (!gl || !gl.getExtension('EXT_color_buffer_float')) return null;
    const linear = gl.getExtension('OES_texture_float_linear');
    gl._fluidTargets = [];
    gl._fluidPrograms = [];
    let quad;
    function releaseTargets() {
      for (const target of gl._fluidTargets) {
        gl.deleteTexture(target.tex);
        gl.deleteFramebuffer(target.fbo);
      }
      gl._fluidTargets.length = 0;
    }
    function destroy() {
      releaseTargets();
      for (const program of gl._fluidPrograms) gl.deleteProgram(program);
      gl._fluidPrograms.length = 0;
      if (quad) gl.deleteBuffer(quad);
    }
    try {
        // Full-screen quad.
        quad = gl.createBuffer()
        gl.bindBuffer(gl.ARRAY_BUFFER, quad)
        gl.bufferData(
            gl.ARRAY_BUFFER,
            new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
            gl.STATIC_DRAW
        )

        // Programs.
        const pAdvect = buildProgram(gl, VS, FS_ADVECT)
        const pSplat = buildProgram(gl, VS, FS_SPLAT)
        const pDiv = buildProgram(gl, VS, FS_DIVERGENCE)
        const pCurl = buildProgram(gl, VS, FS_CURL)
        const pVort = buildProgram(gl, VS, FS_VORTICITY)
        const pPressure = buildProgram(gl, VS, FS_PRESSURE)
        const pGradSub = buildProgram(gl, VS, FS_GRADIENT_SUB)
        const pDisplay = buildProgram(gl, VS, FS_DISPLAY)
        const pClear = buildProgram(gl, VS, FS_CLEAR)

        const programs = [
            pAdvect,
            pSplat,
            pDiv,
            pCurl,
            pVort,
            pPressure,
            pGradSub,
            pDisplay,
            pClear,
        ]
        gl._fluidPrograms.push(...programs.filter(Boolean))
        if (programs.some(program => !program)) throw new Error('Fluid shader failed')
        // Attach quad attribute once per program.
        for (const p of programs) {
            gl.useProgram(p)
            const loc = gl.getAttribLocation(p, "a_pos")
            if (loc >= 0) {
                gl.enableVertexAttribArray(loc)
                gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0)
            }
        }

        // FBOs sized to canvas-derived sim/dye res.
        let velocity
        let dye
        let pressure
        let divergence
        let curl

        function getResolution(target        ) {
            const aspect = canvas.clientWidth / Math.max(1, canvas.clientHeight)
            return { w: Math.max(1, Math.round(target * Math.min(1, aspect))),
                     h: Math.max(1, Math.round(target / Math.max(1, aspect))) }
        }

        function initFBOs() {
            releaseTargets()
            const sim = getResolution(SIM_RESOLUTION)
            const dyeR = getResolution(DYE_RESOLUTION)
            const ext = gl
            velocity = createDoubleFBO(
                ext,
                sim.w,
                sim.h,
                ext.RG16F,
                ext.RG,
                ext.HALF_FLOAT,
                (linear ? ext.LINEAR : ext.NEAREST)
            )
            dye = createDoubleFBO(
                ext,
                dyeR.w,
                dyeR.h,
                ext.RGBA16F,
                ext.RGBA,
                ext.HALF_FLOAT,
                (linear ? ext.LINEAR : ext.NEAREST)
            )
            pressure = createDoubleFBO(
                ext,
                sim.w,
                sim.h,
                ext.R16F,
                ext.RED,
                ext.HALF_FLOAT,
                ext.NEAREST
            )
            divergence = createFBO(
                ext,
                sim.w,
                sim.h,
                ext.R16F,
                ext.RED,
                ext.HALF_FLOAT,
                ext.NEAREST
            )
            curl = createFBO(
                ext,
                sim.w,
                sim.h,
                ext.R16F,
                ext.RED,
                ext.HALF_FLOAT,
                ext.NEAREST
            )
        }

        function blit(target                                     ) {
            if (target) {
                gl .bindFramebuffer(gl .FRAMEBUFFER, target.fbo)
                gl .viewport(0, 0, target.w, target.h)
            } else {
                gl .bindFramebuffer(gl .FRAMEBUFFER, null)
                gl .viewport(0, 0, canvas.width, canvas.height)
            }
            gl .drawArrays(gl .TRIANGLE_STRIP, 0, 4)
        }

        function resize() {
            const dpr = Math.min(window.devicePixelRatio || 1, 1.5)
            const w = Math.max(1, Math.floor(canvas.clientWidth * dpr))
            const h = Math.max(1, Math.floor(canvas.clientHeight * dpr))
            if (canvas.width !== w || canvas.height !== h) {
                canvas.width = w
                canvas.height = h
                initFBOs()
            }
        }
        resize()
        if (!velocity) initFBOs()
        let previous = null
        const palette = ['--color-electric-blue', '--color-mint-pop', '--color-lavender']
            .map(token => parseColor(getComputedStyle(canvas).getPropertyValue(token).trim()))

        function splatAt(
            x        ,
            y        ,
            dx        ,
            dy        ,
            color
        ) {
            const aspect = canvas.width / canvas.height
            // Mouse radius slider → gaussian falloff size.
            const mr = 10
            const radius = correctRadius((mr * 0.005) / 100, aspect)

            // Velocity splat.
            gl .useProgram(pSplat)
            gl .uniform1i(
                gl .getUniformLocation(pSplat, "u_target") ,
                velocity.read.attach(0)
            )
            gl .uniform1f(gl .getUniformLocation(pSplat, "u_aspect") , aspect)
            gl .uniform2f(gl .getUniformLocation(pSplat, "u_point") , x, y)
            gl .uniform3f(gl .getUniformLocation(pSplat, "u_color") , dx, dy, 0)
            gl .uniform1f(gl .getUniformLocation(pSplat, "u_radius") , radius)
            gl .uniform1f(gl .getUniformLocation(pSplat, "u_radial") , 1.0)
            blit(velocity.write)
            velocity.swap()

            // Dye splat.
            gl .useProgram(pSplat)
            gl .uniform1i(
                gl .getUniformLocation(pSplat, "u_target") ,
                dye.read.attach(0)
            )
            gl .uniform1f(gl .getUniformLocation(pSplat, "u_aspect") , aspect)
            gl .uniform2f(gl .getUniformLocation(pSplat, "u_point") , x, y)
            gl .uniform3f(
                gl .getUniformLocation(pSplat, "u_color") ,
                color[0],
                color[1],
                color[2]
            )
            gl .uniform1f(gl .getUniformLocation(pSplat, "u_radius") , radius)
            gl .uniform1f(gl .getUniformLocation(pSplat, "u_radial") , 0.0)
            blit(dye.write)
            dye.swap()
        }

        function correctRadius(r        , aspect        ) {
            return aspect > 1 ? r * aspect : r
        }

        function step(dt        ) {
            // Curl + vorticity confinement.
            gl .useProgram(pCurl)
            gl .uniform2f(
                gl .getUniformLocation(pCurl, "u_texel") ,
                velocity.texel[0],
                velocity.texel[1]
            )
            gl .uniform1i(
                gl .getUniformLocation(pCurl, "u_velocity") ,
                velocity.read.attach(0)
            )
            blit(curl)

            gl .useProgram(pVort)
            gl .uniform2f(
                gl .getUniformLocation(pVort, "u_texel") ,
                velocity.texel[0],
                velocity.texel[1]
            )
            gl .uniform1i(
                gl .getUniformLocation(pVort, "u_velocity") ,
                velocity.read.attach(0)
            )
            gl .uniform1i(
                gl .getUniformLocation(pVort, "u_curl") ,
                curl.attach(1)
            )
            gl .uniform1f(
                gl .getUniformLocation(pVort, "u_curlStrength") ,
                CURL_STRENGTH
            )
            gl .uniform1f(gl .getUniformLocation(pVort, "u_dt") , dt)
            blit(velocity.write)
            velocity.swap()

            // Divergence.
            gl .useProgram(pDiv)
            gl .uniform2f(
                gl .getUniformLocation(pDiv, "u_texel") ,
                velocity.texel[0],
                velocity.texel[1]
            )
            gl .uniform1i(
                gl .getUniformLocation(pDiv, "u_velocity") ,
                velocity.read.attach(0)
            )
            blit(divergence)

            // Clear pressure with decay.
            gl .useProgram(pClear)
            gl .uniform1i(
                gl .getUniformLocation(pClear, "u_tex") ,
                pressure.read.attach(0)
            )
            gl .uniform1f(gl .getUniformLocation(pClear, "u_value") , 0.8)
            blit(pressure.write)
            pressure.swap()

            // Jacobi pressure iterations.
            gl .useProgram(pPressure)
            gl .uniform2f(
                gl .getUniformLocation(pPressure, "u_texel") ,
                velocity.texel[0],
                velocity.texel[1]
            )
            const divLoc = gl .getUniformLocation(pPressure, "u_divergence")
            const presLoc = gl .getUniformLocation(pPressure, "u_pressure")
            gl .uniform1i(divLoc, divergence.attach(0))
            const iters = PRESSURE_ITERATIONS
            for (let i = 0; i < iters; i++) {
                gl .uniform1i(presLoc, pressure.read.attach(1))
                blit(pressure.write)
                pressure.swap()
            }

            // Subtract pressure gradient from velocity.
            gl .useProgram(pGradSub)
            gl .uniform2f(
                gl .getUniformLocation(pGradSub, "u_texel") ,
                velocity.texel[0],
                velocity.texel[1]
            )
            gl .uniform1i(
                gl .getUniformLocation(pGradSub, "u_pressure") ,
                pressure.read.attach(0)
            )
            gl .uniform1i(
                gl .getUniformLocation(pGradSub, "u_velocity") ,
                velocity.read.attach(1)
            )
            blit(velocity.write)
            velocity.swap()

            // Advect velocity.
            gl .useProgram(pAdvect)
            gl .uniform2f(
                gl .getUniformLocation(pAdvect, "u_texel") ,
                velocity.texel[0],
                velocity.texel[1]
            )
            gl .uniform1i(
                gl .getUniformLocation(pAdvect, "u_velocity") ,
                velocity.read.attach(0)
            )
            gl .uniform1i(
                gl .getUniformLocation(pAdvect, "u_source") ,
                velocity.read.attach(0)
            )
            gl .uniform1f(gl .getUniformLocation(pAdvect, "u_dt") , dt)
            gl .uniform1f(
                gl .getUniformLocation(pAdvect, "u_dissipation") ,
                1 - 0.2 * dt
            )
            gl .uniform1f(gl .getUniformLocation(pAdvect, "u_outward") , 0)
            blit(velocity.write)
            velocity.swap()

            // Advect dye using velocity field.
            gl .useProgram(pAdvect)
            gl .uniform2f(
                gl .getUniformLocation(pAdvect, "u_texel") ,
                dye.texel[0],
                dye.texel[1]
            )
            gl .uniform1i(
                gl .getUniformLocation(pAdvect, "u_velocity") ,
                velocity.read.attach(0)
            )
            gl .uniform1i(
                gl .getUniformLocation(pAdvect, "u_source") ,
                dye.read.attach(1)
            )
            gl .uniform1f(gl .getUniformLocation(pAdvect, "u_dt") , dt)
            // Trail Duration in seconds → exponential dye fade (~95% gone after
            // `dur` seconds): factor exp(-dyeDiss·t), dyeDiss = 3/dur.
            const dur = 3.5
            const dyeDiss = 3 / dur
            gl .uniform1f(
                gl .getUniformLocation(pAdvect, "u_dissipation") ,
                1 - dyeDiss * dt
            )
            // Fade outside: drift dye outward from centre as it fades.
            const fadeOut = false
            gl .uniform1f(
                gl .getUniformLocation(pAdvect, "u_outward") ,
                fadeOut ? 0.6 * dt : 0
            )
            blit(dye.write)
            dye.swap()
        }

        function render() {
            gl .useProgram(pDisplay)
            gl .uniform1i(
                gl .getUniformLocation(pDisplay, "u_tex") ,
                dye.read.attach(0)
            )
            blit(null)
        }


        return {
            resize,
            clear() {
                previous = null
                initFBOs()
                render()
            },
            advance(tail, width, height, dt, time) {
                if (gl.isContextLost()) return
                resize()
                const x = tail.x / width
                const y = 1 - tail.y / height
                if (previous && Math.hypot(x - previous.x, y - previous.y) < 0.2) {
                    const phase = (time / 4) % palette.length
                    const index = Math.floor(phase)
                    const blend = phase - index
                    const color = palette[index].map((value, channel) =>
                        (value * (1 - blend) + palette[(index + 1) % palette.length][channel] * blend) * 0.45)
                    const dx = x - previous.x
                    const dy = y - previous.y
                    if (Math.hypot(dx, dy) > 0.00001) splatAt(x, y, dx * SPLAT_FORCE, dy * SPLAT_FORCE, color)
                }
                previous = { x, y }
                step(Math.min(0.033, Math.max(0.001, dt)))
                render()
            },
            destroy,
        }
    } catch (error) {
        destroy();
        console.warn('Hero fluid trail unavailable:', error.message);
        return null;
    }
  };
})(typeof window !== 'undefined' ? window : globalThis);
