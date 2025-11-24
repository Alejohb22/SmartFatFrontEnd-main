// Configuración de la API
const API_URL = 'http://localhost:3000/api';

// Variable para almacenar los datos originales
let originalUserData = null;
let isEditMode = false;

// Verificar autenticación y cargar datos al iniciar
window.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('token');
    const usuario = JSON.parse(localStorage.getItem('usuario') || '{}');
    
    if (!token) {
        window.location.href = 'index.html';
        return;
    }
    
    // Mostrar nombre del usuario en navbar
    document.getElementById('userName').textContent = usuario.nombre || 'Usuario';
    
    // Mostrar información del usuario en sidebar
    if (document.getElementById('userNameSidebar')) {
        document.getElementById('userNameSidebar').textContent = usuario.nombre || 'Usuario';
    }
    if (document.getElementById('userEmailSidebar')) {
        document.getElementById('userEmailSidebar').textContent = usuario.correo || 'email@example.com';
    }
    
    // Cargar perfil completo
    loadUserProfile();
    
    // Event listener para el formulario de perfil
    document.getElementById('profileForm').addEventListener('submit', handleProfileUpdate);
    
    // Event listener para el formulario de contraseña
    document.getElementById('passwordForm').addEventListener('submit', handlePasswordChange);
});

// ========================================
// FUNCIONES DEL MENÚ LATERAL
// ========================================

function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    
    sidebar.classList.toggle('active');
    overlay.classList.toggle('active');
    
    if (sidebar.classList.contains('active')) {
        document.body.style.overflow = 'hidden';
    } else {
        document.body.style.overflow = 'auto';
    }
}

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        const sidebar = document.getElementById('sidebar');
        if (sidebar && sidebar.classList.contains('active')) {
            toggleSidebar();
        }
    }
});

// Cerrar sesión
function logout() {
    if (confirm('¿Estás seguro de que quieres cerrar sesión?')) {
        localStorage.removeItem('token');
        localStorage.removeItem('usuario');
        window.location.href = 'index.html';
    }
}

// ========================================
// FUNCIONES DEL PERFIL
// ========================================

// Cargar perfil del usuario
async function loadUserProfile() {
    const token = localStorage.getItem('token');
    
    console.log('📋 Cargando perfil del usuario...');
    console.log('🔑 Token:', token ? 'Presente' : 'No presente');
    
    try {
        console.log(`🌐 Solicitando: ${API_URL}/usuarios/perfil`);
        
        const response = await fetch(`${API_URL}/usuarios/perfil`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        console.log('📡 Response status:', response.status);
        
        if (response.status === 401 || response.status === 403) {
            console.error('❌ No autorizado');
            logout();
            return;
        }
        
        if (!response.ok) {
            throw new Error(`Error HTTP: ${response.status}`);
        }
        
        const userData = await response.json();
        console.log('✅ Datos del usuario cargados:', userData);
        originalUserData = { ...userData };
        
        // Actualizar localStorage con datos frescos
        const storedUser = JSON.parse(localStorage.getItem('usuario') || '{}');
        const updatedUser = { ...storedUser, ...userData };
        localStorage.setItem('usuario', JSON.stringify(updatedUser));
        
        // Actualizar UI
        displayUserProfile(userData);
        
        // Cargar estadísticas
        loadUserStats();
        
    } catch (error) {
        console.error('❌ Error al cargar perfil:', error);
        showMessage('Error al cargar el perfil', 'error');
    }
}

// Mostrar datos del perfil
function displayUserProfile(userData) {
    // Avatar inicial
    const initial = userData.nombre ? userData.nombre.charAt(0).toUpperCase() : 'U';
    document.getElementById('avatarInitial').textContent = initial;
    
    // Información principal
    document.getElementById('profileName').textContent = userData.nombre || 'Usuario';
    document.getElementById('profileEmail').textContent = userData.correo || 'email@example.com';
    
    // Formulario de edición
    document.getElementById('editName').value = userData.nombre || '';
    document.getElementById('editEmail').value = userData.correo || '';
    document.getElementById('editAge').value = userData.edad || '';
    document.getElementById('editWeight').value = userData.peso_actual || '';
    document.getElementById('editHeight').value = userData.altura || '';
    
    // Calcular métricas
    calculateMetrics(userData);
}

// Calcular métricas (IMC, peso ideal, etc.)
function calculateMetrics(userData) {
    const weight = parseFloat(userData.peso_actual);
    const height = parseFloat(userData.altura);
    
    if (weight && height) {
        // Calcular IMC
        const imc = weight / (height * height);
        document.getElementById('metricIMC').textContent = imc.toFixed(1);
        
        // Clasificación del IMC
        let imcStatus = '';
        let imcColor = '';
        
        if (imc < 18.5) {
            imcStatus = 'Bajo peso';
            imcColor = '#3b82f6';
        } else if (imc < 25) {
            imcStatus = 'Normal';
            imcColor = '#10b981';
        } else if (imc < 30) {
            imcStatus = 'Sobrepeso';
            imcColor = '#f59e0b';
        } else {
            imcStatus = 'Obesidad';
            imcColor = '#ef4444';
        }
        
        const statusElement = document.getElementById('metricIMCStatus');
        statusElement.textContent = imcStatus;
        statusElement.style.color = imcColor;
        
        // Calcular peso ideal (fórmula de Devine)
        // Para hombres: 50 + 2.3 * (altura_cm - 152.4) / 2.54
        // Para mujeres: 45.5 + 2.3 * (altura_cm - 152.4) / 2.54
        // Usamos promedio ya que no tenemos género
        const heightCm = height * 100;
        const idealWeight = 47.75 + 2.3 * ((heightCm - 152.4) / 2.54);
        document.getElementById('metricIdealWeight').textContent = idealWeight.toFixed(1) + ' kg';
        
    } else {
        document.getElementById('metricIMC').textContent = '--';
        document.getElementById('metricIMCStatus').textContent = 'Datos incompletos';
        document.getElementById('metricIdealWeight').textContent = '-- kg';
    }
}

// Cargar estadísticas del usuario
async function loadUserStats() {
    const token = localStorage.getItem('token');
    
    try {
        // Obtener rutinas
        const routinesResponse = await fetch(`${API_URL}/rutinas`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (routinesResponse.ok) {
            const rutinas = await routinesResponse.json();
            document.getElementById('statRoutines').textContent = rutinas.length;
        }
        
        // TODO: Cuando implementes historial de entrenamientos, actualizar este número
        document.getElementById('statWorkouts').textContent = '0';
        
    } catch (error) {
        console.error('Error al cargar estadísticas:', error);
    }
}

// Activar modo de edición
function toggleEditMode() {
    isEditMode = !isEditMode;
    
    const inputs = [
        document.getElementById('editName'),
        document.getElementById('editEmail'),
        document.getElementById('editAge'),
        document.getElementById('editWeight'),
        document.getElementById('editHeight')
    ];
    
    const editActions = document.getElementById('editActions');
    const btnToggle = document.getElementById('btnEditToggle');
    
    if (isEditMode) {
        // Activar edición
        inputs.forEach(input => input.disabled = false);
        editActions.style.display = 'flex';
        btnToggle.textContent = '❌ Cancelar';
        btnToggle.classList.add('editing');
    } else {
        // Desactivar edición
        inputs.forEach(input => input.disabled = true);
        editActions.style.display = 'none';
        btnToggle.textContent = '✏️ Editar';
        btnToggle.classList.remove('editing');
        
        // Restaurar valores originales
        if (originalUserData) {
            displayUserProfile(originalUserData);
        }
    }
}

// Cancelar edición
function cancelEdit() {
    toggleEditMode();
}

// Actualizar perfil
async function handleProfileUpdate(event) {
    event.preventDefault();
    
    const token = localStorage.getItem('token');
    
    const nombre = document.getElementById('editName').value.trim();
    const correo = document.getElementById('editEmail').value.trim();
    const edad = document.getElementById('editAge').value;
    const peso_actual = document.getElementById('editWeight').value;
    const altura = document.getElementById('editHeight').value;
    
    if (!nombre || !correo) {
        showMessage('El nombre y correo son obligatorios', 'error');
        return;
    }
    
    console.log('💾 Intentando actualizar perfil...');
    
    try {
        const response = await fetch(`${API_URL}/usuarios/perfil`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                nombre,
                edad: edad ? parseInt(edad) : null,
                peso_actual: peso_actual ? parseFloat(peso_actual) : null,
                altura: altura ? parseFloat(altura) : null
            })
        });
        
        console.log('📡 Response status:', response.status);
        
        if (!response.ok) {
            const data = await response.json();
            throw new Error(data.error || 'Error al actualizar el perfil');
        }
        
        // Actualizar localStorage
        const storedUser = JSON.parse(localStorage.getItem('usuario') || '{}');
        storedUser.nombre = nombre;
        storedUser.correo = correo;
        storedUser.edad = edad ? parseInt(edad) : null;
        storedUser.peso_actual = peso_actual ? parseFloat(peso_actual) : null;
        storedUser.altura = altura ? parseFloat(altura) : null;
        localStorage.setItem('usuario', JSON.stringify(storedUser));
        
        // Actualizar UI
        document.getElementById('userName').textContent = nombre;
        document.getElementById('userNameSidebar').textContent = nombre;
        document.getElementById('userEmailSidebar').textContent = correo;
        
        showMessage('✅ Perfil actualizado exitosamente', 'success');
        
        // Desactivar modo edición
        toggleEditMode();
        
        // Recargar perfil
        loadUserProfile();
        
    } catch (error) {
        console.error('❌ Error:', error);
        showMessage(error.message || 'Error al actualizar el perfil', 'error');
    }
}

// Cambiar contraseña
async function handlePasswordChange(event) {
    event.preventDefault();
    
    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    
    // Validaciones
    if (!currentPassword || !newPassword || !confirmPassword) {
        showMessage('Todos los campos son obligatorios', 'error');
        return;
    }
    
    if (newPassword.length < 6) {
        showMessage('La nueva contraseña debe tener al menos 6 caracteres', 'error');
        return;
    }
    
    if (newPassword !== confirmPassword) {
        showMessage('Las contraseñas no coinciden', 'error');
        return;
    }
    
    const token = localStorage.getItem('token');
    
    console.log('🔐 Intentando cambiar contraseña...');
    
    try {
        const response = await fetch(`${API_URL}/usuarios/cambiar-contrasena`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                contraseña_actual: currentPassword,
                contraseña_nueva: newPassword
            })
        });
        
        console.log('📡 Response status:', response.status);
        
        if (!response.ok) {
            const data = await response.json();
            throw new Error(data.error || 'Error al cambiar la contraseña');
        }
        
        showMessage('🔐 Contraseña cambiada exitosamente', 'success');
        
        // Limpiar formulario
        document.getElementById('passwordForm').reset();
        
    } catch (error) {
        console.error('❌ Error:', error);
        showMessage(error.message || 'Error al cambiar la contraseña', 'error');
    }
}

// Mostrar mensaje
function showMessage(message, type = 'error') {
    const messageDiv = document.getElementById('message');
    messageDiv.textContent = message;
    messageDiv.className = `message ${type} show`;
    
    setTimeout(() => {
        messageDiv.className = 'message';
    }, 5000);
}