import { useEffect, useRef } from 'react';
import { useTheme } from '../context/ThemeContext';

export default function InteractiveBackground() {
    const canvasRef = useRef(null);
    const { dark } = useTheme();

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const parent = canvas.parentElement;
        let animationFrameId;
        let particles = [];
        let mouse = { x: -1000, y: -1000 };
        // Smooth mouse following for the glow
        let glow = { x: -1000, y: -1000 };

        const resize = () => {
            canvas.width = parent.offsetWidth;
            canvas.height = parent.offsetHeight;
            init();
        };

        const init = () => {
            particles = [];
            const numParticles = Math.floor((canvas.width * canvas.height) / 12000);
            for (let i = 0; i < numParticles; i++) {
                particles.push({
                    x: Math.random() * canvas.width,
                    y: Math.random() * canvas.height,
                    vx: (Math.random() - 0.5) * 0.6,
                    vy: (Math.random() - 0.5) * 0.6,
                    size: Math.random() * 2 + 1,
                });
            }
        };

        const draw = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            const isDark = dark;
            const particleColor = isDark ? 'rgba(201, 168, 76, 0.4)' : 'rgba(16, 185, 129, 0.3)';
            const lineColor = isDark ? '201, 168, 76' : '16, 185, 129';
            const glowColor = isDark ? 'rgba(201, 168, 76, 0.08)' : 'rgba(16, 185, 129, 0.06)';

            // Smoothly move glow towards mouse
            if (mouse.x !== -1000) {
                if (glow.x === -1000) {
                    glow.x = mouse.x;
                    glow.y = mouse.y;
                } else {
                    glow.x += (mouse.x - glow.x) * 0.1;
                    glow.y += (mouse.y - glow.y) * 0.1;
                }
            }

            // Draw glowing orb trailing the mouse
            if (glow.x !== -1000) {
                const gradient = ctx.createRadialGradient(glow.x, glow.y, 0, glow.x, glow.y, 300);
                gradient.addColorStop(0, glowColor);
                gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
                ctx.fillStyle = gradient;
                ctx.fillRect(0, 0, canvas.width, canvas.height);
            }

            particles.forEach(p => {
                p.x += p.vx;
                p.y += p.vy;

                if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
                if (p.y < 0 || p.y > canvas.height) p.vy *= -1;

                // Interactive push from mouse slightly
                const dx = mouse.x - p.x;
                const dy = mouse.y - p.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < 150) {
                    const force = (150 - dist) / 150;
                    p.x -= dx * force * 0.03;
                    p.y -= dy * force * 0.03;
                }

                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.fillStyle = particleColor;
                ctx.fill();
            });

            for (let i = 0; i < particles.length; i++) {
                for (let j = i + 1; j < particles.length; j++) {
                    const dx = particles[i].x - particles[j].x;
                    const dy = particles[i].y - particles[j].y;
                    const dist = Math.sqrt(dx * dx + dy * dy);

                    if (dist < 130) {
                        ctx.beginPath();
                        ctx.moveTo(particles[i].x, particles[i].y);
                        ctx.lineTo(particles[j].x, particles[j].y);
                        ctx.lineWidth = 1;
                        ctx.strokeStyle = `rgba(${lineColor}, ${(1 - dist / 130) * 0.4})`;
                        ctx.stroke();
                    }
                }
            }

            animationFrameId = requestAnimationFrame(draw);
        };

        const handleMouseMove = (e) => {
            const rect = parent.getBoundingClientRect();
            mouse.x = e.clientX - rect.left;
            mouse.y = e.clientY - rect.top;
        };

        const handleMouseLeave = () => {
            mouse.x = -1000;
            mouse.y = -1000;
        };

        window.addEventListener('resize', resize);
        parent.addEventListener('mousemove', handleMouseMove);
        parent.addEventListener('mouseleave', handleMouseLeave);

        resize();
        draw();

        return () => {
            window.removeEventListener('resize', resize);
            parent.removeEventListener('mousemove', handleMouseMove);
            parent.removeEventListener('mouseleave', handleMouseLeave);
            cancelAnimationFrame(animationFrameId);
        };
    }, [dark]);

    return (
        <canvas
            ref={canvasRef}
            className="absolute inset-0 pointer-events-none"
            style={{ zIndex: 0 }}
        />
    );
}
