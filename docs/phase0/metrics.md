| Body | Scenario | Method | Within 5% | Size error mean / p95 / max | Not square, mean / p95 | Mirrored | Seam | Time |
|---|---|---|---|---|---|---|---|---|
| male | Forearm front, 3×4 in | three.js DecalGeometry | 39.1% | 194.7% / 713.5% / 4018.1% | 194.7% / 713.5% | 20.6% | – | – |
| male | Forearm front, 3×4 in | Exponential map | 93.5% | 1.2% / 5.8% / 5.9% | 1.3% / 5.8% | 0.0% | – | 12.8 ms |
| male | Forearm front, 3×4 in | Cylindrical, joint axis (θ·r) | 19.7% | 6.2% / 22.1% / 22.8% | 9.4% / 26.0% | 0.0% | – | – |
| male | Forearm front, 3×4 in | Cylindrical, fitted axis (θ·r) | 25.8% | 5.8% / 11.3% / 14.2% | 7.7% / 15.6% | 0.0% | – | – |
| male | Forearm front, 3×4 in | Cylindrical, joint axis (arc length) | 49.1% | 3.4% / 7.8% / 8.2% | 6.8% / 15.9% | 0.0% | – | – |
| male | Forearm front, 3×4 in | Cylindrical, fitted axis (arc length) | 68.6% | 2.1% / 5.5% / 5.6% | 4.0% / 10.8% | 0.0% | – | – |
| male | Forearm outer, 3×4 in | three.js DecalGeometry | 19.2% | 334.2% / 1740.2% / 3564.6% | 334.2% / 1740.2% | 18.2% | – | – |
| male | Forearm outer, 3×4 in | Exponential map | 92.3% | 1.4% / 6.9% / 7.3% | 1.7% / 7.1% | 0.0% | – | 2.3 ms |
| male | Forearm outer, 3×4 in | Cylindrical, joint axis (θ·r) | 46.5% | 5.0% / 10.2% / 12.4% | 6.9% / 13.7% | 0.0% | – | – |
| male | Forearm outer, 3×4 in | Cylindrical, fitted axis (θ·r) | 48.3% | 4.2% / 8.5% / 10.8% | 6.2% / 12.4% | 0.0% | – | – |
| male | Forearm outer, 3×4 in | Cylindrical, joint axis (arc length) | 58.1% | 2.5% / 6.9% / 9.8% | 4.8% / 13.9% | 0.0% | – | – |
| male | Forearm outer, 3×4 in | Cylindrical, fitted axis (arc length) | 54.7% | 2.7% / 7.0% / 7.8% | 5.2% / 13.5% | 0.0% | – | – |
| male | Forearm full band, 1.5 in | Cylindrical (θ·r) + close band | 45.3% | 5.0% / 10.8% / 11.9% | 5.5% / 11.1% | 0.0% | -0.00 mm | – |
| male | Forearm full band, 1.5 in | Cylindrical (arc length) + close band | 62.9% | 4.1% / 6.4% / 6.9% | 4.6% / 7.0% | 0.0% | -0.00 mm | – |
| male | Forearm full band, 3 in, fixed width | Cylindrical (arc length), no closing | 25.0% | 7.2% / 13.4% / 14.9% | 14.9% / 27.9% | 0.0% | 17.72 mm | – | positive = gap at the seam where the forearm is wider than the design; negative = overlap
| male | Forearm full band, 1.5 in | three.js DecalGeometry | – | – | – | – | – | – | not possible: a box projection cannot wrap around a limb
| male | Across the inner elbow, 3×5 in | Exponential map | 97.3% | 1.6% / 3.5% / 11.0% | 1.8% / 4.2% | 0.0% | – | 1.7 ms |
| male | Across the inner elbow, 3×5 in | three.js DecalGeometry | 24.5% | 121.2% / 402.8% / 3361.1% | 121.2% / 402.8% | 31.4% | – | – |
| male | Across the inner elbow, 3×5 in | Cylindrical (forearm only) | 63.4% | 3.2% / 10.8% / 13.8% | 5.5% / 16.5% | 0.0% | – | – | covers only the forearm half: the upper-arm skin is outside its region
| male | Left shoulder blade, 4×4 in | three.js DecalGeometry | 75.2% | 3.5% / 12.0% / 38.9% | 3.5% / 12.0% | 0.0% | – | – |
| male | Left shoulder blade, 4×4 in | Exponential map | 97.8% | 0.7% / 2.4% / 4.1% | 0.9% / 3.0% | 0.0% | – | 1.7 ms |
| male | Exp map speed, 2×2 in | Exponential map | – | – | – | – | – | 0.7 ms | 42 vertices
| male | Exp map speed, 4×4 in | Exponential map | – | – | – | – | – | 1.1 ms | 84 vertices
| male | Exp map speed, 8×8 in | Exponential map | – | – | – | – | – | 2.1 ms | 243 vertices
| male | Exp map speed, 12×12 in | Exponential map | – | – | – | – | – | 16.2 ms | 5436 vertices
| female | Forearm front, 3×4 in | three.js DecalGeometry | 28.9% | 279.8% / 658.7% / 13444.2% | 279.8% / 658.7% | 32.7% | – | – |
| female | Forearm front, 3×4 in | Exponential map | 95.9% | 1.5% / 4.8% / 9.3% | 1.6% / 4.8% | 0.0% | – | 4.5 ms |
| female | Forearm front, 3×4 in | Cylindrical, joint axis (θ·r) | 20.2% | 6.9% / 13.8% / 13.9% | 9.8% / 17.8% | 0.0% | – | – |
| female | Forearm front, 3×4 in | Cylindrical, fitted axis (θ·r) | 26.3% | 6.3% / 13.3% / 14.1% | 8.5% / 16.7% | 0.0% | – | – |
| female | Forearm front, 3×4 in | Cylindrical, joint axis (arc length) | 58.8% | 2.8% / 7.7% / 7.8% | 5.5% / 16.2% | 0.0% | – | – |
| female | Forearm front, 3×4 in | Cylindrical, fitted axis (arc length) | 62.9% | 2.4% / 6.5% / 6.9% | 4.5% / 13.3% | 0.0% | – | – |
| female | Forearm outer, 3×4 in | three.js DecalGeometry | 15.8% | 1325.1% / 3693.8% / 128731.8% | 1325.1% / 3693.8% | 34.4% | – | – |
| female | Forearm outer, 3×4 in | Exponential map | 94.4% | 1.5% / 8.2% / 9.7% | 1.7% / 8.2% | 0.0% | – | 1.9 ms |
| female | Forearm outer, 3×4 in | Cylindrical, joint axis (θ·r) | 36.8% | 8.1% / 33.1% / 34.1% | 9.8% / 36.3% | 0.0% | – | – |
| female | Forearm outer, 3×4 in | Cylindrical, fitted axis (θ·r) | 44.9% | 6.1% / 28.5% / 32.4% | 8.1% / 29.0% | 0.0% | – | – |
| female | Forearm outer, 3×4 in | Cylindrical, joint axis (arc length) | 57.3% | 2.7% / 7.3% / 7.8% | 5.3% / 15.3% | 0.0% | – | – |
| female | Forearm outer, 3×4 in | Cylindrical, fitted axis (arc length) | 46.9% | 3.0% / 6.6% / 7.5% | 5.8% / 14.0% | 0.0% | – | – |
| female | Forearm full band, 1.5 in | Cylindrical (θ·r) + close band | 52.6% | 4.8% / 12.1% / 12.9% | 5.2% / 12.1% | 0.0% | -0.00 mm | – |
| female | Forearm full band, 1.5 in | Cylindrical (arc length) + close band | 61.2% | 4.2% / 6.3% / 6.6% | 4.6% / 6.9% | 0.0% | -0.00 mm | – |
| female | Forearm full band, 3 in, fixed width | Cylindrical (arc length), no closing | 22.8% | 7.1% / 13.1% / 14.4% | 14.7% / 27.9% | 0.0% | -18.15 mm | – | positive = gap at the seam where the forearm is wider than the design; negative = overlap
| female | Forearm full band, 1.5 in | three.js DecalGeometry | – | – | – | – | – | – | not possible: a box projection cannot wrap around a limb
| female | Across the inner elbow, 3×5 in | Exponential map | 69.9% | 4.4% / 14.4% / 21.2% | 4.5% / 14.5% | 0.0% | – | 0.9 ms |
| female | Across the inner elbow, 3×5 in | three.js DecalGeometry | 20.0% | 172.7% / 442.4% / 4034.7% | 172.7% / 442.4% | 44.9% | – | – |
| female | Across the inner elbow, 3×5 in | Cylindrical (forearm only) | 71.9% | 3.2% / 14.8% / 26.9% | 5.2% / 23.2% | 0.0% | – | – | covers only the forearm half: the upper-arm skin is outside its region
| female | Left shoulder blade, 4×4 in | three.js DecalGeometry | 81.7% | 3.5% / 19.4% / 21.6% | 3.5% / 19.4% | 0.0% | – | – |
| female | Left shoulder blade, 4×4 in | Exponential map | 100.0% | 0.7% / 2.0% / 2.9% | 0.8% / 2.6% | 0.0% | – | 0.7 ms |
| female | Exp map speed, 2×2 in | Exponential map | – | – | – | – | – | 0.3 ms | 48 vertices
| female | Exp map speed, 4×4 in | Exponential map | – | – | – | – | – | 0.3 ms | 97 vertices
| female | Exp map speed, 8×8 in | Exponential map | – | – | – | – | – | 0.8 ms | 307 vertices
| female | Exp map speed, 12×12 in | Exponential map | – | – | – | – | – | 23.4 ms | 6315 vertices
