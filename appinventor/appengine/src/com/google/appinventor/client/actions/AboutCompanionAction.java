// -*- mode: java; c-basic-offset: 2; -*-
// Copyright 2009-2011 Google, All Rights reserved
// Copyright 2011-2024 MIT, All rights reserved
// Released under the Apache License, Version 2.0
// http://www.apache.org/licenses/LICENSE-2.0

package com.google.appinventor.client.actions;

import static com.google.appinventor.client.Ode.MESSAGES;

import com.google.appinventor.client.editor.blocks.BlocklyPanel;
import com.google.appinventor.components.common.YaVersion;
import com.google.gwt.core.client.GWT;
import com.google.gwt.user.client.Command;
import com.google.gwt.user.client.ui.Button;
import com.google.gwt.user.client.ui.DialogBox;
import com.google.gwt.user.client.ui.HTML;
import com.google.gwt.user.client.ui.SimplePanel;
import com.google.gwt.user.client.ui.VerticalPanel;

/**
 * Command for displaying information about the companion app.
 */
public class AboutCompanionAction implements Command {
  @Override
  public void execute() {
    final DialogBox db = new DialogBox(false, true);
    db.setText("PolyCrest Companion & PCstarter Downloads");
    db.setStyleName("ode-DialogBox");
    db.setHeight("auto");
    db.setWidth("480px");
    db.setGlassEnabled(true);
    db.setAnimationEnabled(true);
    db.center();

    String baseUrl = GWT.getHostPageBaseURL();
    if (baseUrl.endsWith("/")) {
      baseUrl = baseUrl.substring(0, baseUrl.length() - 1);
    }
    String apkUrl = baseUrl + "/appstudio/PolyCrestCompanion.apk";
    String hubUrl = baseUrl + "/appstudio/";

    String downloadinfo = "<div style='font-family: Outfit, sans-serif; padding: 12px; color: #F8FAFC;'>"
        + "<div style='margin-bottom: 12px; font-size: 14px; color: #94A3B8;'>Target Companion Version: <b style='color: #00D4FF;'>" + YaVersion.PREFERRED_COMPANION + "</b></div>"
        + "<div style='display: flex; gap: 16px; align-items: center; background: #1E293B; padding: 14px; border-radius: 12px; border: 1px solid #0D99FF; margin-bottom: 14px;'>"
        + "  <div>" + BlocklyPanel.getQRCode(apkUrl) + "</div>"
        + "  <div style='display: flex; flex-direction: column; gap: 8px;'>"
        + "    <div style='font-weight: bold; font-size: 15px; color: #FFF;'>📱 Scan to Download APK</div>"
        + "    <div style='font-size: 12px; color: #94A3B8;'>Scan with your Android camera or download directly:</div>"
        + "    <a href='" + apkUrl + "' download style='display: inline-block; padding: 8px 14px; background: linear-gradient(135deg, #0D99FF, #00D4FF); color: #000; font-weight: bold; border-radius: 6px; text-decoration: none; text-align: center; font-size: 13px;'>📥 Download Companion APK</a>"
        + "  </div>"
        + "</div>"
        + "<div style='background: #1E293B; padding: 14px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.1); margin-bottom: 14px;'>"
        + "  <div style='font-weight: bold; font-size: 14px; color: #FFF; margin-bottom: 4px;'>⚡ PCstarter Desktop Bridge (USB &amp; Emulator)</div>"
        + "  <div style='font-size: 12px; color: #94A3B8; margin-bottom: 8px;'>Required for 1-click USB debugging and hardware-accelerated Android emulation on macOS &amp; Windows.</div>"
        + "  <a href='" + hubUrl + "' target='_blank' style='display: inline-block; padding: 6px 12px; background: #334155; color: #00D4FF; font-weight: bold; border: 1px solid #00D4FF; border-radius: 6px; text-decoration: none; font-size: 12px;'>🌐 Open PCstarter Download Hub &rarr;</a>"
        + "</div>"
        + "</div>";

    VerticalPanel dialogBoxContents = new VerticalPanel();
    HTML message = new HTML(downloadinfo);

    SimplePanel holder = new SimplePanel();
    holder.getElement().getStyle().setProperty("textAlign", "center");
    holder.getElement().getStyle().setProperty("marginTop", "10px");
    Button ok = new Button(MESSAGES.hdrClose());
    ok.addClickHandler((e) -> db.hide());
    holder.add(ok);
    dialogBoxContents.add(message);
    dialogBoxContents.add(holder);
    db.setWidget(dialogBoxContents);
    db.show();
  }
}
