package ca.example.kilo;

import org.apache.cordova.DroidGap;

import android.os.Bundle;

public class KiloMainActivity extends DroidGap {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        super.loadUrl("file:///android_asset/www/index.html");//setContentView(R.layout.activity_kilo_main);
    }

/*    @Override
    public boolean onCreateOptionsMenu(Menu menu) {
        getMenuInflater().inflate(R.menu.activity_kilo_main, menu);
        return true;
    }*/
}
