"use client";

import { Sun, Moon, ArrowUpRight, ArrowRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Mark, Brand } from "./brand";
import { copy } from "../content/stories";
import { sharedCopy } from "../content/free-preview-copy";
import type { DirectionProps } from "./types";

export function Header(props: DirectionProps) {
  const text = sharedCopy.navigation;
  const themeLabel = props.dark ? text.light : text.dark;
  return (
    <header className="site-header">
      <div className="page-width header-inner">
        <Button
          variant="ghost"
          className="wordmark"
          onClick={props.onLanding}
          aria-label={text.home}
        >
          <Mark />
          oparax
        </Button>
        <nav aria-label="Site navigation">
          {props.page === "landing" ? (
            <>
              <Button variant="ghost" asChild>
                <a href="#product">{text.product}</a>
              </Button>
              <Button variant="ghost" asChild>
                <a href="#roadmap">{text.roadmap}</a>
              </Button>
              <Button variant="ghost" asChild>
                <a href="#pricing">{text.pricing}</a>
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" className="nav-active" onClick={props.onFeed}>
                {text.feed}
              </Button>
              <Button variant="ghost" onClick={props.onLanding}>
                {text.website}
              </Button>
            </>
          )}
        </nav>
        <div className="header-actions">
          <TooltipProvider delayDuration={250}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon-lg"
                  className="theme-button"
                  onClick={props.onTheme}
                  aria-label={themeLabel}
                >
                  {props.dark ? <Sun /> : <Moon />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>{themeLabel}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          {props.page === "landing" ? (
            <>
              <Button variant="ghost" className="login-link" onClick={props.onSignup}>
                {text.login}
              </Button>
              <Button size="lg" onClick={props.onSignup}>
                {text.signup}
              </Button>
            </>
          ) : (
            <span className="reader-avatar" title={text.reader}>
              F
            </span>
          )}
        </div>
      </div>
    </header>
  );
}

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="page-width">
        {sharedCopy.footer.map((link) => (
          <a key={link.label} href={link.href}>
            {link.label}
          </a>
        ))}
      </div>
    </footer>
  );
}

export function Pricing({
  onSignup,
  variant = "table",
}: {
  onSignup: () => void;
  variant?: "table" | "cards";
}) {
  const text = sharedCopy.pricing;
  return (
    <section id="pricing" className={`pricing-section page-width ${variant}`}>
      <div className="section-intro">
        <h2>{text.heading}</h2>
        <p>{text.intro}</p>
      </div>
      {variant === "cards" ? (
        <div className="plan-grid">
          {copy.plans.map((plan) => (
            <Card className="plan-card" key={plan.name}>
              <CardHeader className="px-0">
                <CardTitle>
                  <h3>{plan.name}</h3>
                </CardTitle>
                <p className="plan-price">
                  {plan.price}
                  <small>{text.month}</small>
                </p>
              </CardHeader>
              <Separator />
              <CardContent className="px-0">
                <ul>
                  <li className="plan-pool">
                    <Brand name="x" />
                    <span>
                      <strong>{plan.posts}</strong> watched X posts / month
                    </span>
                  </li>
                  <li>
                    <Check />
                    {text.sitesCard}
                  </li>
                  <li>
                    <Check />
                    {plan.cadence} X alerts
                  </li>
                  <li>
                    <Brand name="github" />
                    {text.githubCard}
                  </li>
                  <li>
                    <Brand name="producthunt" />
                    {text.producthuntCard}
                  </li>
                </ul>
              </CardContent>
              <CardFooter className="px-0">
                <Button variant="outline" size="lg" className="w-full" onClick={onSignup}>
                  Choose {plan.name}
                  <ArrowRight data-icon="inline-end" />
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="price-scroll py-0">
          <Table>
            <TableCaption className="sr-only">{text.caption}</TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead scope="col">{text.included}</TableHead>
                {copy.plans.map((plan) => (
                  <TableHead key={plan.name} scope="col">
                    <span>{plan.name}</span>
                    <strong>
                      {plan.price}
                      <small> {text.month}</small>
                    </strong>
                    <Button variant="outline" size="lg" onClick={onSignup}>
                      {sharedCopy.navigation.signup}
                    </Button>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableHead scope="row">
                  <Brand name="x" />
                  {text.posts}
                </TableHead>
                {copy.plans.map((plan) => (
                  <TableCell key={plan.name}>{plan.posts}</TableCell>
                ))}
              </TableRow>
              <TableRow>
                <TableHead scope="row">{text.alerts}</TableHead>
                {copy.plans.map((plan) => (
                  <TableCell key={plan.name}>{plan.cadence}</TableCell>
                ))}
              </TableRow>
              <TableRow>
                <TableHead scope="row">
                  <Brand name="rss" />
                  {text.sites}
                </TableHead>
                {copy.plans.map((plan) => (
                  <TableCell key={plan.name}>{text.unlimited}</TableCell>
                ))}
              </TableRow>
              <TableRow>
                <TableHead scope="row">
                  <Brand name="github" />
                  {text.github}
                </TableHead>
                {copy.plans.map((plan) => (
                  <TableCell key={plan.name}>{text.optional}</TableCell>
                ))}
              </TableRow>
              <TableRow>
                <TableHead scope="row">
                  <Brand name="producthunt" />
                  {text.producthunt}
                </TableHead>
                {copy.plans.map((plan) => (
                  <TableCell key={plan.name}>{text.optional}</TableCell>
                ))}
              </TableRow>
            </TableBody>
          </Table>
        </Card>
      )}
      <p className="section-footnote">{text.footnote}</p>
    </section>
  );
}

export function SignupDialog({
  open,
  onClose,
  onFeed,
}: {
  open: boolean;
  onClose: () => void;
  onFeed: () => void;
}) {
  const text = sharedCopy.signup;
  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (!value) onClose();
      }}
    >
      <DialogContent className="signup-dialog">
        <DialogHeader>
          <DialogTitle>{text.heading}</DialogTitle>
          <DialogDescription>{text.description}</DialogDescription>
        </DialogHeader>
        <div className="signup-options">
          {text.options.map((option) => (
            <Button
              key={option.id}
              variant="outline"
              size="lg"
              onClick={() => {
                onClose();
                onFeed();
              }}
            >
              <Brand name={option.id} />
              {option.label}
              <ArrowUpRight data-icon="inline-end" />
            </Button>
          ))}
        </div>
        <small>{text.notice}</small>
      </DialogContent>
    </Dialog>
  );
}
