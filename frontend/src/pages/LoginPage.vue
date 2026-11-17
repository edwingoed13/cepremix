<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { User, Lock, KeyRound, BadgeCheck, ChevronLeft } from 'lucide-vue-next'
import { useAuthStore } from '@/features/auth/auth.store'
import { useUiStore } from '@/shared/lib/ui.store'
import { apiFetch } from '@/shared/lib/api'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const ui = useUiStore()

const mode = ref<'login' | 'register'>(route.query.mode === 'register' ? 'register' : 'login')
const username = ref('')
const displayName = ref('')
const password = ref('')
const code = ref('')
const error = ref('')
const busy = ref(false)
const codeRequired = ref(false)

onMounted(async () => {
  try {
    const cfg = await apiFetch<{ registration_code_required: boolean }>('/api/auth/config')
    codeRequired.value = cfg.registration_code_required
  } catch {
    /* sin backend: el error saldrá al enviar */
  }
})

const canSubmit = computed(
  () =>
    username.value.trim().length >= 3 &&
    password.value.length >= (mode.value === 'register' ? 6 : 1) &&
    (mode.value === 'login' || !codeRequired.value || code.value.trim().length > 0),
)

function switchMode(m: 'login' | 'register'): void {
  mode.value = m
  error.value = ''
}

async function submit(): Promise<void> {
  if (!canSubmit.value || busy.value) return
  busy.value = true
  error.value = ''
  try {
    if (mode.value === 'login') {
      await auth.login(username.value.trim(), password.value)
    } else {
      await auth.register({
        username: username.value.trim(),
        password: password.value,
        display_name: displayName.value.trim(),
        code: code.value.trim(),
      })
    }
    ui.toast(`Hola, ${auth.displayName}`)
    const next = typeof route.query.next === 'string' ? route.query.next : '/'
    void router.replace(next.startsWith('/') ? next : '/')
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'No se pudo completar'
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <div class="page login">
    <button class="icon-btn back" aria-label="Volver" @click="router.back()">
      <ChevronLeft :size="24" />
    </button>

    <div class="card">
      <img src="/favicon.svg" alt="" class="logo" />
      <h1 class="large-title">{{ mode === 'login' ? 'Inicia sesión' : 'Crea tu cuenta' }}</h1>
      <p class="subtitle">
        {{
          mode === 'login'
            ? 'Tus playlists y favoritos, en cualquier dispositivo.'
            : 'Solo para el personal. Tu biblioteca se guarda en el servidor de la oficina.'
        }}
      </p>

      <div class="chips switch" role="tablist">
        <button class="chip" :class="{ on: mode === 'login' }" role="tab" @click="switchMode('login')">
          Entrar
        </button>
        <button class="chip" :class="{ on: mode === 'register' }" role="tab" @click="switchMode('register')">
          Crear cuenta
        </button>
      </div>

      <form class="form" @submit.prevent="submit">
        <label class="field">
          <User :size="16" />
          <input
            v-model="username"
            placeholder="Usuario"
            aria-label="Usuario"
            autocomplete="username"
            autocapitalize="none"
            spellcheck="false"
          />
        </label>
        <label v-if="mode === 'register'" class="field">
          <BadgeCheck :size="16" />
          <input v-model="displayName" placeholder="Nombre visible (ej. Ana Pérez)" aria-label="Nombre visible" autocomplete="name" />
        </label>
        <label class="field">
          <Lock :size="16" />
          <input
            v-model="password"
            type="password"
            :placeholder="mode === 'register' ? 'Contraseña (mín. 6)' : 'Contraseña'"
            aria-label="Contraseña"
            :autocomplete="mode === 'register' ? 'new-password' : 'current-password'"
          />
        </label>
        <label v-if="mode === 'register' && codeRequired" class="field">
          <KeyRound :size="16" />
          <input v-model="code" placeholder="Código de la oficina" aria-label="Código de registro" />
        </label>

        <p v-if="error" class="error" role="alert">{{ error }}</p>

        <button class="btn btn--accent submit" type="submit" :disabled="!canSubmit || busy">
          {{ busy ? 'Un momento…' : mode === 'login' ? 'Entrar' : 'Crear cuenta' }}
        </button>
      </form>

      <p class="hint">
        También puedes seguir escuchando sin cuenta: tu biblioteca se queda en este dispositivo.
      </p>
    </div>
  </div>
</template>

<style scoped>
.login {
  min-height: 100%;
}
.back {
  margin-left: -8px;
}
.card {
  max-width: 420px;
  margin: var(--space-4) auto 0;
}
.logo {
  width: 44px;
  height: 44px;
  margin-bottom: var(--space-4);
}
.switch {
  margin: var(--space-6) 0 var(--space-4);
}
.form {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}
.error {
  margin: 0;
  padding: var(--space-2) var(--space-3);
  border-radius: var(--radius-sm);
  background: color-mix(in srgb, var(--danger) 14%, transparent);
  color: var(--danger);
  font-size: 14px;
}
.submit {
  height: 48px;
  margin-top: var(--space-2);
  font-size: 15px;
}
.submit:disabled {
  opacity: 0.5;
  pointer-events: none;
}
.hint {
  margin-top: var(--space-6);
  font-size: 13px;
  line-height: 1.45;
  color: var(--text-muted);
  text-align: center;
}
@media (min-width: 1024px) {
  .switch {
    margin: var(--space-6) 0 var(--space-4);
  }
}
</style>
