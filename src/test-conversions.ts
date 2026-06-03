import { convertQuantity, calculateUnitPrice, getBaseQuantityAndPrice } from './lib/conversions';
import Decimal from 'decimal.js';

function runTests() {
  console.log('=== STARTING UNIT TESTS FOR UNIT CONVERSIONS ===');
  let passed = true;

  const assert = (condition: boolean, msg: string) => {
    if (condition) {
      console.log(`[PASS] ${msg}`);
    } else {
      console.error(`[FAIL] ${msg}`);
      passed = false;
    }
  };

  // Test 1: Weight Conversions
  try {
    // 1.5 kg to g -> should be 1500 g
    const qtyG = convertQuantity(1.5, 'kg', 'g');
    assert(qtyG.equals(new Decimal(1500)), `1.5 kg should convert to 1500 g, got ${qtyG.toString()}`);

    // 250 g to kg -> should be 0.25 kg
    const qtyKg = convertQuantity(250, 'g', 'kg');
    assert(qtyKg.equals(new Decimal(0.25)), `250 g should convert to 0.25 kg, got ${qtyKg.toString()}`);
  } catch (err: any) {
    console.error('Test 1 failed with error:', err.message);
    passed = false;
  }

  // Test 2: Volume Conversions
  try {
    // 0.75 L to mL -> should be 750 mL
    const qtyMl = convertQuantity(0.75, 'L', 'mL');
    assert(qtyMl.equals(new Decimal(750)), `0.75 L should convert to 750 mL, got ${qtyMl.toString()}`);

    // 50 mL to L -> should be 0.05 L
    const qtyL = convertQuantity(50, 'mL', 'L');
    assert(qtyL.equals(new Decimal(0.05)), `50 mL should convert to 0.05 L, got ${qtyL.toString()}`);
  } catch (err: any) {
    console.error('Test 2 failed with error:', err.message);
    passed = false;
  }

  // Test 3: Dimension Mismatches
  try {
    // Should throw error when converting kg to L
    convertQuantity(1, 'kg', 'L');
    assert(false, 'Should throw error when converting kg to L');
  } catch (err: any) {
    assert(
      err.message.includes('Dimension mismatch'),
      `Should reject weight-to-volume conversion, got: ${err.message}`
    );
  }

  // Test 4: Pricing Calculations
  try {
    // Price of g = 0.45 INR/g. Price of kg should be 450 INR/kg.
    const priceKg = calculateUnitPrice(0.45, 'g', 'kg');
    assert(priceKg.equals(new Decimal(450)), `Price per kg should be 450, got ${priceKg.toString()}`);

    // Price of mL = 0.15 INR/mL. Price of L should be 150 INR/L.
    const priceL = calculateUnitPrice(0.15, 'mL', 'L');
    assert(priceL.equals(new Decimal(150)), `Price per Liter should be 150, got ${priceL.toString()}`);
  } catch (err: any) {
    console.error('Test 4 failed with error:', err.message);
    passed = false;
  }

  // Test 5: Subtotal & Base calculations helper
  try {
    // Product baseUnit = 'g', pricePerBaseUnit = 0.8 INR/g (Sodium Hydroxide)
    // Seller orders 2.5 kg.
    // Base quantity should be 2500 g.
    // Price per ordered unit (kg) should be 800 INR/kg.
    // Subtotal should be 2000 INR.
    const { baseQuantity, pricePerUnit, subtotal } = getBaseQuantityAndPrice(
      2.5,
      'kg',
      'g',
      0.8
    );

    assert(baseQuantity.equals(new Decimal(2500)), `Base quantity should be 2500 g, got ${baseQuantity.toString()}`);
    assert(pricePerUnit.equals(new Decimal(800)), `Price per unit should be 800 INR/kg, got ${pricePerUnit.toString()}`);
    assert(subtotal.equals(new Decimal(2000)), `Subtotal should be 2000 INR, got ${subtotal.toString()}`);
  } catch (err: any) {
    console.error('Test 5 failed with error:', err.message);
    passed = false;
  }

  console.log('=== TEST RESULT ===');
  if (passed) {
    console.log('ALL TESTS PASSED SUCCESSFULLY! ✅');
  } else {
    console.error('SOME TESTS FAILED! ❌');
    process.exit(1);
  }
}

runTests();
