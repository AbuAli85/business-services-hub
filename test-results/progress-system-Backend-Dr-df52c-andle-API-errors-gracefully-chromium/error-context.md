# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e3]:
    - generic [ref=e4]:
      - generic [ref=e7]:
        - img
        - generic [ref=e21]:
          - generic [ref=e22]: BusinessHub
          - generic [ref=e23]: Services Platform
      - heading "Welcome Back" [level=3] [ref=e24]
      - paragraph [ref=e25]: Sign in to your Business Services Hub account
    - generic [ref=e26]:
      - generic [ref=e27]:
        - generic [ref=e28]:
          - generic [ref=e29]: Email
          - textbox "Email" [ref=e30]
        - generic [ref=e31]:
          - generic [ref=e32]: Password
          - generic [ref=e33]:
            - textbox "Password" [ref=e34]
            - button [ref=e35] [cursor=pointer]:
              - img [ref=e36] [cursor=pointer]
        - button "Sign In" [ref=e39] [cursor=pointer]
      - generic [ref=e40]:
        - generic [ref=e45]: Or continue with
        - button "Continue with Google" [ref=e46] [cursor=pointer]:
          - img [ref=e47] [cursor=pointer]
          - text: Continue with Google
      - generic [ref=e52]:
        - generic [ref=e53]: Don't have an account?
        - link "Sign up" [ref=e54] [cursor=pointer]:
          - /url: /auth/sign-up
      - generic [ref=e55]:
        - button "Forgot your password?" [ref=e56] [cursor=pointer]
        - button "Resend confirmation email" [ref=e57] [cursor=pointer]
  - alert [ref=e58]
```