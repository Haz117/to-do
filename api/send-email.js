// api/send-email.js
// Serverless function de Vercel para enviar emails de forma segura
// Las API Keys no se exponen al cliente

export default async function handler(req, res) {
  // Solo permitir POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { to, subject, html, type } = req.body;

    // Validaciones
    if (!to || !subject || !html) {
      return res.status(400).json({ error: 'Missing required fields: to, subject, html' });
    }

    // Validar email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(to)) {
      return res.status(400).json({ error: 'Invalid email address' });
    }

    // Obtener API Key de variables de entorno
    const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
    const FROM_EMAIL = process.env.FROM_EMAIL || 'noreply@todoapp.com';
    const FROM_NAME = process.env.FROM_NAME || 'Sistema de Tareas';

    if (!SENDGRID_API_KEY) {
      console.error('[ERROR] SENDGRID_API_KEY not configured');
      return res.status(500).json({ error: 'Email service not configured' });
    }

    // Enviar email con SendGrid
    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SENDGRID_API_KEY}`
      },
      body: JSON.stringify({
        personalizations: [{
          to: [{ email: to }],
          subject: subject
        }],
        from: { 
          email: FROM_EMAIL,
          name: FROM_NAME
        },
        content: [{
          type: 'text/html',
          value: html
        }]
      })
    });

    if (response.ok) {
      console.log('[SUCCESS] Email sent to:', to, '| Type:', type);
      return res.status(200).json({ 
        success: true, 
        message: 'Email sent successfully' 
      });
    } else {
      const errorText = await response.text();
      console.error('[ERROR] SendGrid error:', errorText);
      return res.status(500).json({ 
        error: 'Failed to send email',
        details: errorText 
      });
    }
  } catch (error) {
    console.error('[ERROR] Error in send-email:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
}
