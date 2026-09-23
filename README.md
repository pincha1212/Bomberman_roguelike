# Bomberman Roguelike v3.14 — Powerups & Relics 2

## Enfoque

Esta versión amplía el sistema roguelike con categorías de build y reliquias que modifican reglas ya existentes. Los efectos se acumulan durante una misma run y buscan crear decisiones simples pero combinables.

## Categorías

- **BOMB** — bombas, colocación y temporización.
- **FIRE** — alcance y puntuación ligada al poder de fuego.
- **SPEED** — velocidad permanente.
- **DEFENSE** — vida, escudo e invulnerabilidad.
- **MOVEMENT** — asistencia para girar y tomar corredores.
- **RISK** — poder adicional a cambio de mayor peligro.
- **ECONOMY** — monedas y recompensas.

## Nuevas reliquias

**⏱ MECHA CORTA — BOMB**  
Las bombas tienen una mecha 28% más corta.

**🧨 PÓLVORA INESTABLE — RISK**  
+1 rango de bomba. Las propias explosiones son menos tolerantes al roce.

**🧲 BOTAS MAGNÉTICAS — MOVEMENT**  
Mejora la asistencia de giro, el centrado y la ventana para tomar una esquina.

**🔆 LENTE TÉRMICA — FIRE**  
+1 rango de bomba y +10% de puntuación por enemigos derrotados.

**🪙 NÚCLEO DE SALVAMENTO — ECONOMY**  
+20% de monedas obtenidas. Se acumula con otros bonos económicos.

**🔷 CAPARAZÓN CINÉTICO — DEFENSE**  
Añade 250 ms de invulnerabilidad después de recibir daño.

## Reliquias existentes recategorizadas

- Núcleo Ígneo → FIRE
- Mecha Gemela → BOMB
- Botas de Hierro → SPEED
- Motor Vital → DEFENSE
- Placa de Guarda → DEFENSE
- Trofeo de Guerra → RISK
- Amuleto Afortunado → ECONOMY
- Sello del Mercader → ECONOMY

## Combinaciones

Las reliquias se suman a los powerups normales. Una build puede combinar, por ejemplo, más bombas con una mecha corta, más rango con pólvora inestable y mejores giros con botas magnéticas.

## Interfaz

Las recompensas muestran su categoría y las reliquias activas también muestran su categoría en la tira superior. Esto permite leer rápidamente qué tipo de build está formando la run.

## Compatibilidad

Proyecto web estático para GitHub Pages. HTML, CSS y JavaScript vanilla, sin backend ni bundler.
