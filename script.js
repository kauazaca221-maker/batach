const form = document.querySelector(".contact-form");
const WEBHOOK_PLACEHOLDER = "COLE_AQUI_A_URL_DO_WEBHOOK_N8N";

function getWebhookUrl(formElement) {
  const configuredUrl =
    window.BATACH_N8N_WEBHOOK_URL || formElement.dataset.webhookUrl || formElement.action || "";

  return configuredUrl.trim();
}

function isValidWebhookUrl(url) {
  return /^https?:\/\//i.test(url) && !url.includes(WEBHOOK_PLACEHOLDER);
}

function setFormStatus(formElement, message, state) {
  const status = formElement.querySelector(".form-status");
  if (!status) return;

  status.textContent = message;
  status.dataset.state = state;
}

function getLeadPayload(formElement) {
  const data = new FormData(formElement);

  return {
    nome: String(data.get("nome") || "").trim(),
    especialidade: String(data.get("especialidade") || "").trim(),
    whatsapp: String(data.get("whatsapp") || "").trim(),
    email: String(data.get("email") || "").trim(),
    form_name: String(data.get("form_name") || "contato_home").trim(),
    page_url: window.location.href,
    user_agent: window.navigator.userAgent,
    source: "batach-medicos-landing",
    submitted_at: new Date().toISOString(),
  };
}

function toWebhookBody(payload) {
  const body = new URLSearchParams();

  Object.entries(payload).forEach(([key, value]) => {
    body.append(key, value);
  });

  return body;
}

function pushLeadToDataLayer(payload) {
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({
    event: "lead_form_submit",
    form_name: payload.form_name,
    lead_nome: payload.nome,
    lead_especialidade: payload.especialidade,
    lead_whatsapp: payload.whatsapp,
    lead_email: payload.email,
    page_url: payload.page_url,
    source: payload.source,
    submitted_at: payload.submitted_at,
  });
}

if (form) {
  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const button = form.querySelector("button");
    const pageUrl = form.querySelector('input[name="page_url"]');
    const userAgent = form.querySelector('input[name="user_agent"]');
    const webhookUrl = getWebhookUrl(form);

    if (!button) return;

    if (!isValidWebhookUrl(webhookUrl)) {
      setFormStatus(form, "Webhook do n8n ainda não configurado.", "error");
      return;
    }

    if (pageUrl) pageUrl.value = window.location.href;
    if (userAgent) userAgent.value = window.navigator.userAgent;

    const payload = getLeadPayload(form);
    const originalText = button.textContent;

    button.textContent = "Enviando...";
    button.classList.add("is-sending");
    button.disabled = true;
    setFormStatus(form, "", "idle");

    try {
      await fetch(webhookUrl, {
        method: "POST",
        mode: "no-cors",
        body: toWebhookBody(payload),
        keepalive: true,
      });

      pushLeadToDataLayer(payload);
      form.reset();
      setFormStatus(form, "Dados enviados. A equipe Batach vai entrar em contato.", "success");
      button.textContent = "Enviado";
    } catch (error) {
      setFormStatus(form, "Não foi possível enviar agora. Tente novamente em instantes.", "error");
      button.textContent = originalText;
    } finally {
      window.setTimeout(() => {
        button.textContent = originalText;
        button.classList.remove("is-sending");
        button.disabled = false;
      }, 1800);
    }
  });
}
