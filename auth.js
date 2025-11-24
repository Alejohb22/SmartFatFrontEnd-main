// Configuración de la API
const API_URL = 'http://localhost:3000/api';

// Función para alternar entre login y registro
function toggleForms() {
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    
    loginForm.classList.toggle('active');
    registerForm.classList.toggle('active');
    
    // Limpiar mensaje
    hideMessage();
}

// Función para mostrar mensajes
function showMessage(message, type = 'error') {
    const messageDiv = document.getElementById('message');
    messageDiv.textContent = message;
    messageDiv.className = `message ${type} show`;
    
    // Ocultar después de 5 segundos
    setTimeout(() => {
        hideMessage();
    }, 5000);
}

function hideMessage() {
    const messageDiv = document.getElementById('message');
    messageDiv.className = 'message';
}

// Manejar registro
async function handleRegister(event) {
    event.preventDefault();
    
    const nombre = document.getElementById('registerName').value;
    const correo = document.getElementById('registerEmail').value;
    const contraseña = document.getElementById('registerPassword').value;
    const edad = document.getElementById('registerAge').value || null;
    const peso_actual = document.getElementById('registerWeight').value || null;
    const altura = document.getElementById('registerHeight').value || null;
    
    try {
        const response = await fetch(`${API_URL}/auth/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                nombre,
                correo,
                contraseña,
                edad: edad ? parseInt(edad) : null,
                peso_actual: peso_actual ? parseFloat(peso_actual) : null,
                altura: altura ? parseFloat(altura) : null
            })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showMessage('¡Registro exitoso! Ahora puedes iniciar sesión.', 'success');
            
            // Cambiar al formulario de login después de 2 segundos
            setTimeout(() => {
                toggleForms();
                // Prellenar el correo en el login
                document.getElementById('loginEmail').value = correo;
            }, 2000);
        } else {
            showMessage(data.error || 'Error al registrar usuario');
        }
    } catch (error) {
        console.error('Error:', error);
        showMessage('Error de conexión. Verifica que el servidor esté corriendo.');
    }
}

// Manejar login
async function handleLogin(event) {
    event.preventDefault();
    
    const correo = document.getElementById('loginEmail').value;
    const contraseña = document.getElementById('loginPassword').value;
    
    try {
        const response = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                correo,
                contraseña
            })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            // Guardar token y usuario en localStorage
            localStorage.setItem('token', data.token);
            localStorage.setItem('usuario', JSON.stringify(data.usuario));
            
            showMessage('¡Inicio de sesión exitoso!', 'success');
            
            // Redirigir al dashboard después de 1 segundo
            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 1000);
        } else {
            showMessage(data.error || 'Credenciales inválidas');
        }
    } catch (error) {
        console.error('Error:', error);
        showMessage('Error de conexión. Verifica que el servidor esté corriendo.');
    }
}

// Verificar si ya hay sesión iniciada al cargar la página
window.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('token');
    if (token && window.location.pathname.includes('index.html')) {
        window.location.href = 'dashboard.html';
    }
});