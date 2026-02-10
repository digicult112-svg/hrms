import { supabase } from './lib/supabase';

/**
 * Diagnostic Tool - Check Data Clearing Functionality
 * 
 * This script tests if the clear_all_employee_data() function exists
 * and can be called properly.
 */

async function testClearDataFunction() {
    console.log('=== Testing Clear All Employee Data Function ===\n');

    try {
        // Test 1: Check if function exists by calling it
        console.log('Test 1: Attempting to call clear_all_employee_data()...');
        const { data, error } = await supabase.rpc('clear_all_employee_data');

        if (error) {
            console.error('❌ ERROR calling function:');
            console.error('Error code:', error.code);
            console.error('Error message:', error.message);
            console.error('Error details:', error.details);
            console.error('Error hint:', error.hint);

            // Specific error codes
            if (error.code === '42883') {
                console.log('\n⚠️  DIAGNOSIS: Function does not exist in database');
                console.log('   ACTION REQUIRED: Apply the migration file via Supabase Dashboard');
            } else if (error.code === 'PGRST202') {
                console.log('\n⚠️  DIAGNOSIS: Function not found or permissions issue');
            } else if (error.message.includes('Access Denied')) {
                console.log('\n⚠️  DIAGNOSIS: User is not an admin');
            }
        } else {
            console.log('✅ Function executed successfully!');
            console.log('Result:', data);
        }

    } catch (err: any) {
        console.error('❌ Unexpected error:', err.message);
    }

    console.log('\n=== Test Complete ===');
}

// Run the test
testClearDataFunction();
