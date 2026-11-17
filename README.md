# PERITA Gym — Demo comercial para gimnasio de hotel

Web estática, responsive y lista para publicar. Incluye panel de aforo, simulador de acceso con torno o tablet, credenciales QR y tarjetas para socios y huéspedes, suscripciones, pases temporales y vista del socio.

## Ejecutar

Abre `index.html` en el navegador. No requiere instalación, compilación ni servidor.

## Publicar

- **Netlify Drop:** entra en https://app.netlify.com/drop y arrastra la carpeta `perita-gym-demo` descomprimida. Obtendrás una URL pública.
- **GitHub Pages:** sube los tres archivos (`index.html`, `styles.css`, `app.js`) a la raíz de un repositorio y activa Pages en Settings > Pages (Deploy from branch).
- **Hosting tradicional:** sube los tres archivos a la carpeta pública del alojamiento web.

## Funcionalidades

- Capacidad de ejemplo: 12 personas (modificable en `app.js`, constante `CAPACITY`, y en los textos de `index.html`).
- Aforo: suma de huéspedes y socios que tienen `inside: true`.
- Entradas bloqueadas si la credencial está caducada, ya figura dentro o se ha alcanzado el aforo máximo.
- Salidas bloqueadas si la persona ya figura fuera.
- Precios: mensual 50 €, trimestral 130 €, anual 480 €.
- Altas simuladas desde el panel por el personal o desde la vista del socio.
- Precios editables y promociones porcentuales con código, plan y fechas de validez.
- Los cambios de precio afectan a las nuevas altas y renovaciones, no al importe guardado en las suscripciones existentes.
- Pases de huéspedes con duración de 1, 3 o 7 días.
- Pase QR imprimible para huéspedes sin tarjeta y QR legible en la vista del socio (ambos contienen solo un identificador de demostración).
- Datos guardados en `localStorage` de cada navegador (sin sincronización entre dispositivos).
- Botón «Reiniciar demo» para recuperar los datos iniciales.

## Límites importantes

Esta es una **demo visual**, no un producto de producción. No existe backend, login, cobro ni lector QR operativo. Altas, pagos, precios y promociones solo se guardan en el navegador; no se sincronizan entre dispositivos. Los QR son códigos reales que contienen únicamente un identificador ficticio: no abren una web ni permiten validar un acceso real. Los movimientos se simulan con botones. El equipo físico debe ser compatible con la credencial: una tablet necesita un lector de tarjetas adicional si se quieren usar tarjetas del gimnasio o del hotel.

Para producción: API/backend centralizado, base de datos, roles, autenticación, credenciales firmadas de corta duración, integración con hardware, registro bidireccional de movimientos, mecanismos anti-passback, reconciliación de aforo y cumplimiento RGPD. Si se desea integrar con el sistema del hotel, habría que estudiar la interfaz de su PMS o sistema de tarjetas.

No introduzcas datos personales reales en esta demo pública: se guardan localmente en el navegador.
