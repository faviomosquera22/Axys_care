# Axyscare iPhone sin laptop

## Qué significa realmente

La app puede usarse sin la computadora si instalas una build `Release` en el iPhone.
Esa build ya lleva el bundle JavaScript embebido y no depende de Metro.

La base de datos y autenticación siguen viviendo en Supabase, así que sí necesita internet.
No necesita tu Mac como servidor.

## Lo que sí y lo que no

- Sí: abrir la app en el iPhone sin Xcode ni `expo start`.
- Sí: usar login, agenda, pacientes y encounters contra Supabase remoto.
- No: usarla sin internet.
- No: distribuirla por TestFlight sin cuenta paga de Apple Developer.

## Limitación sin pagar Apple Developer

Si usas firma gratuita de Xcode con tu Apple ID personal, la instalación en el iPhone sirve para pruebas personales, pero Apple la deja con vencimiento corto.
En la práctica, debes volver a firmar e instalar después de ese vencimiento.

## Flujo recomendado en este repo

### 1. Instalar dependencias

```bash
cd /Users/Apple/Desktop/AXYSCARE
corepack pnpm install
cd /Users/Apple/Desktop/AXYSCARE/apps/mobile/ios
pod install
```

### 2. Crear una build standalone para tu iPhone

Desde la raíz:

```bash
cd /Users/Apple/Desktop/AXYSCARE
corepack pnpm mobile:ios:release
```

Ese comando corre:

```bash
corepack pnpm --filter @axyscare/mobile ios:release:device
```

Si Expo no te deja elegir el dispositivo y termina con un error genérico de `pnpm`, ejecuta el comando indicando el nombre exacto del iPhone:

```bash
cd /Users/Apple/Desktop/AXYSCARE/apps/mobile
npx expo run:ios --configuration Release --device "Nombre de tu iPhone"
```

Ejemplo:

```bash
cd /Users/Apple/Desktop/AXYSCARE/apps/mobile
npx expo run:ios --configuration Release --device "Favio"
```

### 3. Firmar con tu Apple ID en Xcode

- Abre `/Users/Apple/Desktop/AXYSCARE/apps/mobile/ios/Axyscare.xcworkspace`
- Selecciona el target `Axyscare`
- En `Signing & Capabilities` elige tu `Team`
- Si Xcode lo pide, cambia el bundle identifier por uno único en tu cuenta
- Selecciona tu iPhone como destino
- Ejecuta `Run`

## Cómo saber si sigues en modo desarrollo

Si la app muestra errores de `No script URL provided` o necesita `expo start`, sigues usando una build de desarrollo.

Para usarla sin laptop debes abrir la app instalada desde una build `Release`.

## Comandos útiles

Desarrollo con Metro:

```bash
cd /Users/Apple/Desktop/AXYSCARE
corepack pnpm mobile:start:dev-client
```

Instalación normal en device:

```bash
cd /Users/Apple/Desktop/AXYSCARE
corepack pnpm mobile:ios
```

Instalación standalone release en device:

```bash
cd /Users/Apple/Desktop/AXYSCARE
corepack pnpm mobile:ios:release
```

## Qué falta para distribución más cómoda

Si más adelante quieren evitar reinstalar manualmente, entonces sí necesitarán una vía formal de distribución:

- Apple Developer Program
- TestFlight
- o App Store
