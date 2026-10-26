{

  inputs = {
    nixpkgs.url = "https://channels.nixos.org/nixpkgs-unstable/nixexprs.tar.zst";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs =
    {
      self,
      nixpkgs,
      flake-utils,
      ...
    }:
    flake-utils.lib.eachDefaultSystem (
      system:
      let
        pkgs = import nixpkgs { inherit system; };
        zdotdir = pkgs.writeTextDir ".zshrc" ''
          [ -f "$HOME/.zshrc" ] && source "$HOME/.zshrc"

          autoload -Uz compinit && compinit
          setopt prompt_subst
          PROMPT='%F{green}(dev)%f %F{blue}%~%f %# '

          HISTFILE="$HOME/.zsh_history"
          HISTSIZE=10000
          SAVEHIST=10000
          setopt share_history hist_ignore_dups
          bindkey -e
        '';
      in
      {
        devShells.default = pkgs.mkShell {
          packages = with pkgs; [ zsh ];

          shellHook = ''
            if [ -z "$IN_NIX_ZSH" ] && [[ $- == *i* ]]; then
              export IN_NIX_ZSH=1
              export ZDOTDIR=${zdotdir}
              unset PS1
              exec ${pkgs.zsh}/bin/zsh
            fi
          '';
        };
      }
    );

}
