"use client";

import { useRef, useState } from "react";
import { CurrentNavigationLink } from "./CurrentNavigationLink";
import { joinUs, primaryNavigation } from "./navigation";

export function MobileNavigation() {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  function closeMenu() { dialogRef.current?.close(); }
  function openMenu() { dialogRef.current?.showModal(); setOpen(true); }
  return <div className="mobile-navigation"><button ref={triggerRef} className="menu-trigger" type="button" aria-haspopup="dialog" aria-controls="site-navigation-dialog" aria-expanded={open} onClick={openMenu}><span aria-hidden="true">Menu</span><span className="sr-only">Open site navigation</span></button><dialog ref={dialogRef} className="navigation-dialog" id="site-navigation-dialog" aria-label="Site navigation" onKeyDown={(event) => { if (event.key === "Escape") { event.preventDefault(); closeMenu(); } }} onClose={() => { setOpen(false); triggerRef.current?.focus(); }}><div className="navigation-dialog__bar"><p className="eyebrow m-0">Navigation</p><button className="menu-trigger" type="button" onClick={closeMenu}><span aria-hidden="true">Close</span><span className="sr-only">Close site navigation</span></button></div><nav aria-label="Mobile primary navigation"><ul className="mobile-navigation__links">{primaryNavigation.map((item) => <li key={item.href}><CurrentNavigationLink href={item.href} onClick={closeMenu}>{item.label}</CurrentNavigationLink></li>)}</ul><CurrentNavigationLink className="button button-primary mobile-navigation__action" href={joinUs.href} onClick={closeMenu}>{joinUs.label}</CurrentNavigationLink></nav></dialog></div>;
}
