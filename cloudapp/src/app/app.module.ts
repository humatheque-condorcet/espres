import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { APP_INITIALIZER, inject, NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MAT_FORM_FIELD_DEFAULT_OPTIONS } from '@angular/material/form-field';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { AlertModule, CloudAppTranslateModule, InitService, MaterialModule } from '@exlibris/exl-cloudapp-angular-lib';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { MainComponent } from './main/main.component';
import { TruncatePipe } from './pipes/truncate.pipe'; 
import { CapitalizePipe } from './pipes/capitalize.pipe'; 
import { HoldingCheckCardComponent } from './holding-check-card/holding-check-card.component';
import { HoldingSelectorComponent } from './holding-selector/holding-selector.component';
import { HoldingResultsCardComponent } from './holding-results-card/holding-results-card.component';
import { HoldingInfoComponent } from './holding-info/holding-info.component';
import { NoEntitiesComponent } from './no-entities/no-entities.component';
import { HoldingFormComponent } from './holding-form/holding-form.component';

@NgModule({
    declarations: [
        AppComponent,
        CapitalizePipe,
        HoldingCheckCardComponent,
        HoldingFormComponent,
        HoldingInfoComponent,
        HoldingResultsCardComponent,
        MainComponent,
        HoldingSelectorComponent,
        NoEntitiesComponent,
        TruncatePipe,
    ],
    bootstrap: [AppComponent],
    imports: [
        MaterialModule,
        BrowserModule,
        BrowserAnimationsModule,
        AppRoutingModule,
        AlertModule,
        FormsModule,
        ReactiveFormsModule,
        CloudAppTranslateModule.forRoot()
    ],
    providers: [
        { provide: APP_INITIALIZER, useFactory: () => () => true, deps: [InitService], multi: true },
        { provide: MAT_FORM_FIELD_DEFAULT_OPTIONS, useValue: { appearance: 'outline' } },
        provideHttpClient(withInterceptorsFromDi())
    ]
})
export class AppModule { }
