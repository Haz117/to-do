// services/emailNotifications.vercel.js
// Servicio actualizado para usar API de Vercel en lugar de exponer API keys

// URL de tu API de Vercel
const VERCEL_API_URL = process.env.VERCEL_URL 
  ? `https://${process.env.VERCEL_URL}/api/send-email`
  : '/api/send-email'; // Para desarrollo local

/**
 * Enviar email usando API serverless de Vercel
 * @param {Object} params - {to, subject, html, type}
 */
async function sendEmail({ to, subject, html, type = 'notification' }) {
  try {
    const response = await fetch(VERCEL_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ to, subject, html, type })
    });

    const data = await response.json();

    if (response.ok) {
      console.log('[SUCCESS] Email enviado a:', to);
      return { success: true, data };
    } else {
      console.error('[ERROR] Error enviando email:', data);
      return { success: false, error: data.error };
    }
  } catch (error) {
    console.error('[ERROR] Error en sendEmail:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Template base para emails
 */
function getEmailTemplate(title, content, actionUrl, actionText) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; background: #f5f5f5; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 20px auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
    .header { background: linear-gradient(135deg, #9F2241 0%, #751a32 100%); color: white; padding: 30px 20px; text-align: center; }
    .header h1 { margin: 0; font-size: 24px; font-weight: 700; }
    .content { padding: 30px 20px; }
    .content h2 { color: #9F2241; margin-top: 0; font-size: 20px; }
    .button { display: inline-block; background: #9F2241; color: white; padding: 12px 30px; border-radius: 8px; text-decoration: none; font-weight: 600; margin: 20px 0; }
    .button:hover { background: #751a32; }
    .footer { background: #f8f8f8; padding: 20px; text-align: center; font-size: 12px; color: #666; border-top: 1px solid #eee; }
    @media only screen and (max-width: 600px) {
      .container { margin: 10px; }
      .content { padding: 20px 15px; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin-left: 0; padding-left: 0;">${title}</h1>
    </div>
    <div class="content">
      ${content}
      ${actionUrl ? `<center><a href="${actionUrl}" class="button">${actionText || 'Ver Tarea'}</a></center>` : ''}
    </div>
    <div class="footer">
      <p>Este es un mensaje automático de tu sistema de tareas.</p>
      <p>© ${new Date().getFullYear()} TodoApp MORENA. Todos los derechos reservados.</p>
    </div>
  </div>
</body>
</html>
  `;
}

/**
 * Enviar email cuando se asigna una tarea
 */
export async function notifyTaskAssigned(task, assignedToUser) {
  const content = `
    <h2>✨ Nueva tarea asignada</h2>
    <p>Hola <strong>${assignedToUser?.name || assignedToUser?.email}</strong>,</p>
    <p>Se te ha asignado una nueva tarea:</p>
    <div style="background: #f8f8f8; padding: 15px; border-radius: 8px; margin: 15px 0;">
      <strong style="font-size: 16px; color: #9F2241;">${task.title}</strong>
      <p style="margin: 10px 0;">${task.description}</p>
      <p style="margin: 5px 0;"><strong>Área:</strong> ${task.area}</p>
      <p style="margin: 5px 0;"><strong>Prioridad:</strong> <span style="color: ${task.priority === 'alta' ? '#EF4444' : task.priority === 'media' ? '#F59E0B' : '#10B981'}; font-weight: 600;">${task.priority.toUpperCase()}</span></p>
      <p style="margin: 5px 0;"><strong>Vence:</strong> ${new Date(task.dueAt).toLocaleDateString('es-ES', { 
        weekday: 'long',
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })}</p>
    </div>
    <p>Por favor, revisa los detalles y comienza a trabajar en ella lo antes posible.</p>
  `;

  const subject = `Nueva tarea asignada: ${task.title}`;
  const html = getEmailTemplate('Nueva Tarea Asignada', content, task.url, 'Ver Tarea');

  return await sendEmail({
    to: task.assignedTo,
    subject,
    html,
    type: 'task_assigned'
  });
}

/**
 * Enviar email cuando una tarea está por vencer
 */
export async function notifyTaskDueSoon(task, user) {
  const hoursLeft = Math.round((task.dueAt - Date.now()) / (1000 * 60 * 60));
  
  const content = `
    <h2>⏰ Tarea por vencer</h2>
    <p>Hola <strong>${user?.name || user?.email}</strong>,</p>
    <p>La siguiente tarea está por vencer en <strong style="color: #EF4444;">${hoursLeft} horas</strong>:</p>
    <div style="background: #FEF2F2; padding: 15px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #EF4444;">
      <strong style="font-size: 16px; color: #9F2241;">${task.title}</strong>
      <p style="margin: 10px 0;">${task.description}</p>
      <p style="margin: 5px 0;"><strong>Área:</strong> ${task.area}</p>
      <p style="margin: 5px 0;"><strong>Vence:</strong> ${new Date(task.dueAt).toLocaleDateString('es-ES', { 
        weekday: 'long',
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })}</p>
    </div>
    <p style="color: #dc2626; font-weight: 500;"><strong>Importante:</strong> No olvides completarla antes de que venza.</p>
  `;

  const subject = `⏰ Recordatorio: Tarea "${task.title}" vence pronto`;
  const html = getEmailTemplate('Tarea por Vencer', content, task.url, 'Ver Tarea');

  return await sendEmail({
    to: task.assignedTo,
    subject,
    html,
    type: 'task_due_soon'
  });
}

/**
 * Enviar email cuando hay un nuevo mensaje en el chat
 */
export async function notifyNewChatMessage(task, message, recipient) {
  const content = `
    <h2>Nuevo mensaje en tarea</h2>
    <p>Hola <strong>${recipient?.name || recipient?.email}</strong>,</p>
    <p><strong>${message.userName}</strong> escribió en la tarea:</p>
    <div style="background: #f8f8f8; padding: 15px; border-radius: 8px; margin: 15px 0;">
      <strong style="font-size: 16px; color: #9F2241;">${task.title}</strong>
    </div>
    <div style="background: #E8F4FD; padding: 15px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #3B82F6;">
      <p style="margin: 0;"><strong>${message.userName}:</strong></p>
      <p style="margin: 10px 0 0 0;">${message.text}</p>
      <p style="margin: 10px 0 0 0; font-size: 12px; color: #666;">${new Date(message.timestamp).toLocaleString('es-ES')}</p>
    </div>
  `;

  const subject = `Nuevo mensaje en: ${task.title}`;
  const html = getEmailTemplate('Nuevo Mensaje', content, task.url, 'Ver Conversación');

  return await sendEmail({
    to: recipient.email,
    subject,
    html,
    type: 'new_message'
  });
}

/**
 * Enviar email de bienvenida al nuevo usuario
 */
export async function sendWelcomeEmail(user, tempPassword) {
  const content = `
    <h2>¡Bienvenido a TodoApp MORENA!</h2>
    <p>Hola <strong>${user.name}</strong>,</p>
    <p>Tu cuenta ha sido creada exitosamente. Aquí están tus credenciales de acceso:</p>
    <div style="background: #f8f8f8; padding: 20px; border-radius: 8px; margin: 20px 0;">
      <p style="margin: 5px 0;"><strong>Email:</strong> ${user.email}</p>
      <p style="margin: 5px 0;"><strong>Contraseña temporal:</strong> <code style="background: #fff; padding: 5px 10px; border-radius: 4px; color: #9F2241; font-weight: 600;">${tempPassword}</code></p>
      <p style="margin: 5px 0;"><strong>Rol:</strong> ${user.role}</p>
      ${user.department ? `<p style="margin: 5px 0;"><strong>Departamento:</strong> ${user.department}</p>` : ''}
    </div>
    <p style="color: #dc2626; font-weight: 500; background-color: #fef2f2; padding: 12px; border-left: 4px solid #dc2626; border-radius: 4px;"><strong>Importante:</strong> Por seguridad, te recomendamos cambiar tu contraseña después de tu primer inicio de sesión.</p>
  `;

  const subject = 'Bienvenido a TodoApp MORENA';
  const html = getEmailTemplate('Bienvenido', content, process.env.APP_URL, 'Iniciar Sesión');

  return await sendEmail({
    to: user.email,
    subject,
    html,
    type: 'welcome'
  });
}

export { sendEmail, getEmailTemplate };
